"""Train the Makati landmark classifier (MobileNetV2 transfer learning -> TFLite).

Usage:
    ml/.venv/bin/python ml/train.py --data-dir ~/Documents/trained

Pipeline:
    1. Group-aware split: frames from one video (or burst) stay on one side of train/val, so the
       validation score reflects unseen footage rather than near-duplicate neighbours.
    2. Head training on a frozen MobileNetV2, then low-LR fine-tuning of the top layers. Each class's
       weight is split between real photos and video frames (--photo-share).
    3. Test-time augmentation (4 views averaged) and temperature scaling fitted on validation, both
       baked into the exported model: calibrated confidences, one image in.
    4. Confidence threshold chosen on validation to hit --target-precision.
    5. Final fit on train+val with the same schedule (--final), exported as the shipped model.

Outputs (ml/models/):
    landmark_model.tflite  float32 input [1,224,224,3] RGB 0-255, float32 softmax output
    labels.txt             one label per line, index order matches model output
    model_meta.json        input spec, labels, confidence threshold, temperature, metrics
"""

import argparse
import csv
import json
import os
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
from PIL import Image, ImageOps

IMG_SIZE = 224
LOAD_SIZE = 256  # load slightly larger so random crops have room
ML_DIR = Path(__file__).resolve().parent
VIDEO_FRAME = re.compile(r"^video/[^/]+/(.+)_\d{5}\.jpg$")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default=str(Path.home() / "Documents" / "trained"))
    p.add_argument("--labels", default=str(ML_DIR / "labels.csv"))
    p.add_argument("--out", default=str(ML_DIR / "models"))
    p.add_argument("--min-per-class", type=int, default=5)
    p.add_argument("--val-fraction", type=float, default=0.2)
    p.add_argument("--batch", type=int, default=32)
    p.add_argument("--head-epochs", type=int, default=15)
    p.add_argument("--finetune-epochs", type=int, default=40)
    p.add_argument("--finetune-layers", type=int, default=100)
    p.add_argument("--target-precision", type=float, default=0.95,
                   help="pick the lowest confidence threshold whose accepted predictions reach this accuracy")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--label-smoothing", type=float, default=0.1)
    p.add_argument("--finetune-lr", type=float, default=2e-5)
    p.add_argument("--photo-share", type=float, default=0.7, help="share of each class's weight given to real photos vs video frames")
    p.add_argument("--alpha", type=float, default=1.4, help="MobileNetV2 width multiplier (1.0 or 1.4)")
    p.add_argument("--no-final", dest="final", action="store_false", help="skip the train+val refit")
    return p.parse_args()


def load_image(path):
    """EXIF-correct, resize short side to LOAD_SIZE, center crop to square."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im = ImageOps.fit(im, (LOAD_SIZE, LOAD_SIZE), Image.Resampling.BILINEAR)
    return np.asarray(im, dtype=np.uint8)


def group_of(filename):
    """Frames of one video share a group; every other image is its own group."""
    m = VIDEO_FRAME.match(filename)
    return f"video:{m.group(1)}" if m else filename


def load_dataset(data_dir, labels_csv, min_per_class):
    rows = list(csv.DictReader(open(labels_csv, newline="")))
    counts = Counter(r["label"] for r in rows)
    labels = sorted(l for l, c in counts.items() if c >= min_per_class)
    dropped = {l: c for l, c in counts.items() if c < min_per_class}
    rows = [r for r in rows if r["label"] in labels]
    x = np.stack([load_image(Path(data_dir) / r["filename"]) for r in rows])
    y = np.array([labels.index(r["label"]) for r in rows])
    groups = [group_of(r["filename"]) for r in rows]
    is_video = np.array([g.startswith("video:") for g in groups])
    return labels, x, y, groups, is_video, dropped


def group_split(y, groups, num_classes, val_fraction, seed):
    """Per class, move whole groups into val until it holds ~val_fraction of that class."""
    rng = random.Random(seed)
    val = np.zeros(len(y), bool)
    for c in range(num_classes):
        idx = np.where(y == c)[0]
        by_group = defaultdict(list)
        for i in idx:
            by_group[groups[i]].append(i)
        keys = list(by_group)
        rng.shuffle(keys)
        target, taken = max(1, round(len(idx) * val_fraction)), 0
        for k in keys:
            if taken >= target:
                break
            if taken and taken + len(by_group[k]) > target * 1.5 and len(keys) > 1:
                continue  # skip a group that would overshoot badly
            val[by_group[k]] = True
            taken += len(by_group[k])
    return ~val, val


# Medium augmentation: the heavier set (perspective, blur, erasing) measured no better on held-out photos.
augment = tf.keras.Sequential(
    [
        tf.keras.layers.RandomCrop(IMG_SIZE, IMG_SIZE),
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.05),
        tf.keras.layers.RandomZoom((-0.3, 0.1)),           # farther / closer than the original shot
        tf.keras.layers.RandomTranslation(0.08, 0.08),
        tf.keras.layers.RandomBrightness(0.3, value_range=(0, 255)),  # night / overcast / glare
        tf.keras.layers.RandomContrast(0.3),
        tf.keras.layers.RandomSaturation((0.35, 0.65)),
        tf.keras.layers.RandomHue(0.03),
    ]
)
center_crop = tf.keras.layers.CenterCrop(IMG_SIZE, IMG_SIZE)


def source_weights(y, is_video, num_classes, photo_share):
    """Per-sample weights: every class gets equal total weight; inside a class, real photos share
    `photo_share` of it and video frames the rest. Without this, a class's 500 video frames drown out
    its 50 photos and accuracy on real photos (the app's actual input) drops."""
    w = np.zeros(len(y))
    for c in range(num_classes):
        cm = y == c
        pv, vv = cm & ~is_video, cm & is_video
        share = photo_share if pv.any() and vv.any() else 1.0
        if pv.any():
            w[pv] = share / pv.sum()
        if vv.any():
            w[vv] = (1 - share if pv.any() else 1.0) / vv.sum()
    return (w * len(y) / w.sum()).astype(np.float32)


def make_ds(x, y, w, training, batch, seed=0):
    """Batches are gathered from the in-memory uint8 array by a generator, so large datasets never get
    embedded in the TF graph (from_tensor_slices on >2 GB of images hits the protobuf limit)."""
    rng = np.random.default_rng(seed)

    def gen():
        idx = rng.permutation(len(x)) if training else np.arange(len(x))
        stop = len(idx) - len(idx) % batch if training else len(idx)
        for s in range(0, stop, batch):
            b = idx[s:s + batch]
            yield x[b], y[b], w[b]

    sig = (tf.TensorSpec((None, LOAD_SIZE, LOAD_SIZE, 3), tf.uint8), tf.TensorSpec((None,), tf.int64),
           tf.TensorSpec((None,), tf.float32))
    ds = tf.data.Dataset.from_generator(gen, output_signature=sig)
    if training:
        ds = ds.map(lambda a, b, c: (augment(tf.cast(a, tf.float32), training=True), b, c), num_parallel_calls=tf.data.AUTOTUNE)
    else:
        ds = ds.map(lambda a, b, c: (center_crop(tf.cast(a, tf.float32)), b, c), num_parallel_calls=tf.data.AUTOTUNE)
    return ds.prefetch(tf.data.AUTOTUNE)


def build_model(num_classes, alpha):
    base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3), alpha=alpha, include_top=False, weights="imagenet", pooling="avg"
    )
    base.trainable = False
    inputs = tf.keras.Input((IMG_SIZE, IMG_SIZE, 3), name="image")  # RGB 0-255
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1)(inputs)  # MobileNetV2 expects [-1, 1]
    x = base(x, training=False)
    x = tf.keras.layers.Dropout(0.3)(x)
    logits = tf.keras.layers.Dense(num_classes, name="logits")(x)
    return tf.keras.Model(inputs, logits), base


class TTAViews(tf.keras.layers.Layer):
    """[B,224,224,3] -> [4B,224,224,3]: original, mirrored, 85% centre zoom, mirrored zoom."""

    def call(self, x):
        m = int(IMG_SIZE * 0.075)
        z = tf.image.resize(x[:, m:IMG_SIZE - m, m:IMG_SIZE - m, :], (IMG_SIZE, IMG_SIZE))
        return tf.concat([x, tf.reverse(x, axis=[2]), z, tf.reverse(z, axis=[2])], axis=0)


class TTAMean(tf.keras.layers.Layer):
    def call(self, logits):
        return tf.reduce_mean(tf.reshape(logits, (4, -1, tf.shape(logits)[-1])), axis=0)


def tta_logit_model(logit_model):
    inp = tf.keras.Input((IMG_SIZE, IMG_SIZE, 3), name="image")
    return tf.keras.Model(inp, TTAMean()(logit_model(TTAViews()(inp))))


def export_model(logit_model, temperature):
    """Softmax(mean-of-4-views logits / T): test-time augmentation and temperature are baked into the
    graph, so the app sends one 224x224 image and reads calibrated probabilities directly."""
    tta = tta_logit_model(logit_model)
    scaled = tf.keras.layers.Rescaling(1.0 / temperature, name="temperature")(tta.output)
    probs = tf.keras.layers.Softmax(name="probs")(scaled)
    return tf.keras.Model(tta.input, probs)


def sparse_smoothed_ce(smoothing, num_classes):
    """Label-smoothed cross-entropy on logits for integer labels."""
    ce = tf.keras.losses.CategoricalCrossentropy(from_logits=True, label_smoothing=smoothing)
    return lambda y, p: ce(tf.one_hot(tf.cast(tf.reshape(y, [-1]), tf.int32), num_classes), p)


def train(model, base, train_ds, val_ds, num_classes, args, fixed_epochs=None):
    """Returns the (head, finetune) epoch counts actually used, so the final refit can repeat them."""
    loss = sparse_smoothed_ce(args.label_smoothing, num_classes)
    acc = tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy")
    cb = (lambda: [tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)]) \
        if val_ds is not None else (lambda: [])

    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss=loss, metrics=[acc])
    h1 = model.fit(train_ds, validation_data=val_ds, epochs=fixed_epochs[0] if fixed_epochs else args.head_epochs,
                   callbacks=cb(), verbose=2)

    # Fine-tune the top layers; BatchNorm stays frozen because base runs with training=False.
    base.trainable = True
    for layer in base.layers[:-args.finetune_layers]:
        layer.trainable = False
    ft_epochs = fixed_epochs[1] if fixed_epochs else args.finetune_epochs
    model.compile(optimizer=tf.keras.optimizers.Adam(args.finetune_lr), loss=loss, metrics=[acc])
    h2 = model.fit(train_ds, validation_data=val_ds, epochs=ft_epochs, callbacks=cb(), verbose=2)

    def used(h):
        if "val_loss" not in h.history:
            return len(h.history["loss"])
        return int(np.argmin(h.history["val_loss"])) + 1
    return used(h1), used(h2)


def fit_temperature(logits, y):
    """Grid-search T minimising validation NLL."""
    best_t, best_nll = 1.0, np.inf
    for t in np.arange(0.3, 3.01, 0.02):
        z = logits / t
        z = z - z.max(1, keepdims=True)
        logp = z - np.log(np.exp(z).sum(1, keepdims=True))
        nll = -logp[np.arange(len(y)), y].mean()
        if nll < best_nll:
            best_t, best_nll = float(t), nll
    return best_t


def pick_threshold(probs, y, target):
    pred, conf = probs.argmax(1), probs.max(1)
    for th in np.arange(0.30, 0.99, 0.01):
        m = conf >= th
        if m.sum() >= 10 and (pred[m] == y[m]).mean() >= target:
            return float(round(th, 2))
    return 0.9


def to_tflite(model, path):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]  # fp16 weights: half size, ~no accuracy drift; float I/O
    path.write_bytes(converter.convert())


def predict(model, images, batch=16):
    return np.concatenate([model.predict_on_batch(images[s:s + batch].astype(np.float32))
                           for s in range(0, len(images), batch)])


def tflite_predict(path, images):
    interp = tf.lite.Interpreter(model_path=str(path))
    interp.allocate_tensors()
    inp, out = interp.get_input_details()[0], interp.get_output_details()[0]
    preds = []
    for img in images:
        interp.set_tensor(inp["index"], img[None].astype(np.float32))
        interp.invoke()
        preds.append(interp.get_tensor(out["index"])[0])
    return np.array(preds)


def report(probs, y, labels, threshold, mask=None):
    if mask is not None:
        probs, y = probs[mask], y[mask]
    pred, conf = probs.argmax(1), probs.max(1)
    ok = conf >= threshold
    return {
        "images": int(len(y)),
        "top1": float((pred == y).mean()),
        "top3": float(np.mean([t in p.argsort()[-3:] for p, t in zip(probs, y)])),
        "answered_fraction": float(ok.mean()),
        "accuracy_when_answered": float((pred[ok] == y[ok]).mean()) if ok.any() else None,
        "mean_confidence_correct": float(conf[pred == y].mean()) if (pred == y).any() else None,
        "recall_per_class": {l: float((pred[y == i] == i).mean()) for i, l in enumerate(labels) if (y == i).any()},
    }


def main():
    args = parse_args()
    tf.keras.utils.set_random_seed(args.seed)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    labels, x, y, groups, is_video, dropped = load_dataset(args.data_dir, args.labels, args.min_per_class)
    n_cls = len(labels)
    print("classes:", dict(zip(labels, np.bincount(y).tolist())))
    if dropped:
        print(f"skipped (<{args.min_per_class} images):", dropped)

    tr, va = group_split(y, groups, n_cls, args.val_fraction, args.seed)
    w_tr = source_weights(y[tr], is_video[tr], n_cls, args.photo_share)
    w_va = source_weights(y[va], is_video[va], n_cls, args.photo_share)

    model, base = build_model(n_cls, args.alpha)
    epochs = train(model, base, make_ds(x[tr], y[tr], w_tr, True, args.batch),
                   make_ds(x[va], y[va], w_va, False, args.batch), n_cls, args)
    print("best epochs (head, finetune):", epochs)

    off = (LOAD_SIZE - IMG_SIZE) // 2
    val_imgs = x[va][:, off:off + IMG_SIZE, off:off + IMG_SIZE]  # center crop, still uint8
    logits = predict(tta_logit_model(model), val_imgs)
    temperature = fit_temperature(logits, y[va])
    eval_model = export_model(model, temperature)
    tflite_path = out / "landmark_model.tflite"
    to_tflite(eval_model, tflite_path)
    probs = tflite_predict(tflite_path, val_imgs)
    threshold = pick_threshold(probs, y[va], args.target_precision)
    metrics = {
        "train_images": int(tr.sum()), "val_images": int(va.sum()), "temperature": temperature,
        "val_all": report(probs, y[va], labels, threshold),
        "val_photos_only": report(probs, y[va], labels, threshold, ~is_video[va]),
        "keras_tflite_max_abs_diff": float(np.abs(predict(eval_model, val_imgs) - probs).max()),
        "best_epochs": list(epochs),
    }
    print(json.dumps(metrics, indent=2))

    if args.final:
        print("final fit on train+val with", epochs)
        tf.keras.utils.set_random_seed(args.seed)
        final, fbase = build_model(n_cls, args.alpha)
        train(final, fbase, make_ds(x, y, source_weights(y, is_video, n_cls, args.photo_share), True, args.batch),
              None, n_cls, args, fixed_epochs=epochs)
        to_tflite(export_model(final, temperature), tflite_path)
        metrics["shipped"] = "final fit on train+val; metrics above are from the held-out run"

    (out / "labels.txt").write_text("\n".join(labels) + "\n")
    meta = {
        "input": {"shape": [1, IMG_SIZE, IMG_SIZE, 3], "dtype": "float32", "color": "RGB", "range": [0, 255]},
        "output": {"dtype": "float32", "type": "softmax", "temperature_baked_in": temperature},
        "labels": labels,
        "confidence_threshold": threshold,
        "target_precision": args.target_precision,
        "skipped_classes": dropped,
        "metrics": metrics,
    }
    (out / "model_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"threshold={threshold} temperature={temperature}")
    print(f"wrote {tflite_path} ({tflite_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
