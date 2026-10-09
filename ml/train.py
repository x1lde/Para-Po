"""Train the Makati landmark classifier (MobileNetV2 transfer learning -> TFLite).

Usage:
    python ml/train.py --data-dir ~/Documents/trained

Outputs (ml/models/):
    landmark_model.tflite  float32 input [1,224,224,3] RGB 0-255, float32 softmax output
    labels.txt             one label per line, index order matches model output
    model_meta.json        input spec, labels, confidence threshold, metrics
"""

import argparse
import csv
import json
import os
import random
from collections import Counter, defaultdict
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
from PIL import Image, ImageOps

IMG_SIZE = 224
LOAD_SIZE = 256  # load slightly larger so random crops have room
ML_DIR = Path(__file__).resolve().parent


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default=str(Path.home() / "Documents" / "trained"))
    p.add_argument("--labels", default=str(ML_DIR / "labels.csv"))
    p.add_argument("--out", default=str(ML_DIR / "models"))
    p.add_argument("--min-per-class", type=int, default=5)
    p.add_argument("--val-fraction", type=float, default=0.2)
    p.add_argument("--head-epochs", type=int, default=60)
    p.add_argument("--finetune-epochs", type=int, default=20)
    p.add_argument("--threshold", type=float, default=0.7)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


def load_image(path):
    """EXIF-correct, resize short side to LOAD_SIZE, center crop to square."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im = ImageOps.fit(im, (LOAD_SIZE, LOAD_SIZE), Image.Resampling.BILINEAR)
    return np.asarray(im, dtype=np.uint8)


def load_dataset(data_dir, labels_csv, min_per_class):
    rows = list(csv.DictReader(open(labels_csv, newline="")))
    counts = Counter(r["label"] for r in rows)
    kept = sorted(l for l, c in counts.items() if c >= min_per_class)
    dropped = {l: c for l, c in counts.items() if c < min_per_class}
    if len(kept) < 2:
        raise SystemExit(f"Need >=2 classes with >={min_per_class} images, got {dict(counts)}")

    by_class = defaultdict(list)
    for r in rows:
        if r["label"] in kept:
            by_class[r["label"]].append(load_image(Path(data_dir) / r["filename"]))
    return kept, by_class, dropped


def split(by_class, labels, val_fraction, seed):
    rng = random.Random(seed)
    xtr, ytr, xva, yva = [], [], [], []
    for idx, label in enumerate(labels):
        imgs = by_class[label][:]
        rng.shuffle(imgs)
        n_val = max(1, round(len(imgs) * val_fraction))
        xva += imgs[:n_val]
        yva += [idx] * n_val
        xtr += imgs[n_val:]
        ytr += [idx] * (len(imgs) - n_val)
    return np.stack(xtr), np.array(ytr), np.stack(xva), np.array(yva)


augment = tf.keras.Sequential(
    [
        tf.keras.layers.RandomCrop(IMG_SIZE, IMG_SIZE),
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.05),
        tf.keras.layers.RandomZoom((-0.2, 0.1)),
        tf.keras.layers.RandomBrightness(0.25, value_range=(0, 255)),
        tf.keras.layers.RandomContrast(0.3),
    ]
)
center_crop = tf.keras.layers.CenterCrop(IMG_SIZE, IMG_SIZE)


def make_ds(x, y, training, batch=8):
    ds = tf.data.Dataset.from_tensor_slices((tf.cast(x, tf.float32), y))
    if training:
        ds = ds.shuffle(len(x)).repeat(8)  # 8 augmented passes per epoch
        ds = ds.batch(batch).map(lambda a, b: (augment(a, training=True), b))
    else:
        ds = ds.batch(batch).map(lambda a, b: (center_crop(a), b))
    return ds.prefetch(tf.data.AUTOTUNE)


def build_model(num_classes):
    base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights="imagenet", pooling="avg"
    )
    base.trainable = False
    inputs = tf.keras.Input((IMG_SIZE, IMG_SIZE, 3), name="image")  # RGB 0-255
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1)(inputs)  # MobileNetV2 expects [-1, 1]
    x = base(x, training=False)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="probs")(x)
    return tf.keras.Model(inputs, outputs), base


def train(model, base, train_ds, val_ds, args):
    stop = lambda: tf.keras.callbacks.EarlyStopping(  # noqa: E731
        monitor="val_loss", patience=8, restore_best_weights=True
    )
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=args.head_epochs, callbacks=[stop()], verbose=2)

    # Fine-tune the last blocks; BatchNorm stays frozen because base runs with training=False.
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=args.finetune_epochs, callbacks=[stop()], verbose=2)


def to_tflite(model, path):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # dynamic-range int8 weights, float I/O
    path.write_bytes(converter.convert())


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


def main():
    args = parse_args()
    tf.keras.utils.set_random_seed(args.seed)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    labels, by_class, dropped = load_dataset(args.data_dir, args.labels, args.min_per_class)
    print("classes:", {l: len(by_class[l]) for l in labels})
    if dropped:
        print(f"skipped (<{args.min_per_class} images):", dropped)

    xtr, ytr, xva, yva = split(by_class, labels, args.val_fraction, args.seed)
    model, base = build_model(len(labels))
    train(model, base, make_ds(xtr, ytr, True), make_ds(xva, yva, False), args)

    tflite_path = out / "landmark_model.tflite"
    to_tflite(model, tflite_path)

    val_imgs = center_crop(tf.cast(xva, tf.float32)).numpy()
    probs = tflite_predict(tflite_path, val_imgs)
    pred, conf = probs.argmax(1), probs.max(1)
    confident = conf >= args.threshold
    metrics = {
        "train_images": int(len(xtr)),
        "val_images": int(len(xva)),
        "val_accuracy": float((pred == yva).mean()),
        "val_confident_fraction": float(confident.mean()),
        "val_accuracy_when_confident": float((pred[confident] == yva[confident]).mean())
        if confident.any()
        else None,
        "keras_tflite_max_abs_diff": float(np.abs(model.predict(val_imgs, verbose=0) - probs).max()),
    }
    for i, (p, c, t) in enumerate(zip(pred, conf, yva)):
        print(f"val[{i}] true={labels[t]:<22} pred={labels[p]:<22} conf={c:.2f}")

    (out / "labels.txt").write_text("\n".join(labels) + "\n")
    meta = {
        "input": {"shape": [1, IMG_SIZE, IMG_SIZE, 3], "dtype": "float32", "color": "RGB", "range": [0, 255]},
        "output": {"dtype": "float32", "type": "softmax"},
        "labels": labels,
        "confidence_threshold": args.threshold,
        "skipped_classes": dropped,
        "metrics": metrics,
    }
    (out / "model_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))
    print(f"wrote {tflite_path} ({tflite_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
