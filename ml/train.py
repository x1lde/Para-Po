"""Train the Makati landmark classifier (ImageNet transfer learning, MobileNetV3-Large by default -> TFLite).

Usage:
    ml/.venv/bin/python ml/train.py --data-dir ~/Documents/trained

Pipeline:
    1. Group-aware train/val/test split, stratified by source: images that share an origin (one video, one
       web page, one Commons photographer, one album or camera shoot, or near-identical pixels) stay in one
       split, so scores reflect unseen footage rather than near-duplicate neighbours, and every class keeps
       real photos (the app's actual input) in val and test.
    2. Synthetic negatives (blank, flat, gradient, noise and out-of-focus frames) join the `other` class,
       so a covered lens or blank screen is never read as a landmark.
    3. Head training on a frozen backbone, then fine-tuning of every layer with a cosine learning-rate schedule,
       keeping the epoch with the best photo-weighted val accuracy. Each class's weight is split between real
       photos, video frames and synthetic negatives.
    4. Test-time augmentation (4 views averaged) and temperature scaling fitted on val, both baked into
       the exported model: calibrated confidences, one image in.
    5. Confidence threshold chosen on val to hit --target-precision; the run fails if none does.
    6. The exported TFLite file is the shipped model. It is scored on the test split, which no training,
       stopping, calibration or threshold choice has seen, and must reject every blank input.

Nothing in --out is replaced unless every step succeeds.

Outputs (ml/models/):
    landmark_model.tflite  float32 input [1,224,224,3] RGB 0-255, float32 softmax output
    labels.txt             one label per line, index order matches model output
    model_meta.json        input spec, labels, confidence threshold, temperature, metrics
"""

import argparse
import csv
import io
import json
import os
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
from PIL import Image, ImageFilter, ImageOps

IMG_SIZE = 224
LOAD_SIZE = 256  # load slightly larger so random crops have room
CROP_OFFSET = (LOAD_SIZE - IMG_SIZE) // 2
ML_DIR = Path(__file__).resolve().parent
VIDEO_FRAME = re.compile(r"^video/[^/]+/(.+)_\d{5}\.jpg$")
FACEBOOK_PHOTO = re.compile(r"^\d+_\d+_\d+_n\.jpe?g$")
SPLIT_NAMES = ("train", "val", "test")


_IMAGENET = dict(input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights="imagenet", pooling="avg")
# name -> (constructor, whether inputs must be rescaled to [-1, 1]); the others normalize 0-255 internally.
BACKBONES = {
    "mobilenet_v2": (lambda a: tf.keras.applications.MobileNetV2(alpha=a.alpha, **_IMAGENET), True),
    "mobilenet_v3_large": (lambda a: tf.keras.applications.MobileNetV3Large(**_IMAGENET), False),
    "efficientnet_b0": (lambda a: tf.keras.applications.EfficientNetB0(**_IMAGENET), False),
    "efficientnet_v2_b0": (lambda a: tf.keras.applications.EfficientNetV2B0(**_IMAGENET), False),
}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default=str(Path.home() / "Documents" / "trained"))
    p.add_argument("--labels", default=str(ML_DIR / "labels.csv"))
    p.add_argument("--out", default=str(ML_DIR / "models"))
    p.add_argument("--min-per-class", type=int, default=5)
    p.add_argument("--val-fraction", type=float, default=0.15, help="early stopping, temperature and threshold")
    p.add_argument("--test-fraction", type=float, default=0.15, help="final report only; never used to choose anything")
    p.add_argument("--batch", type=int, default=32)
    p.add_argument("--head-epochs", type=int, default=10)
    p.add_argument("--finetune-epochs", type=int, default=25)
    p.add_argument("--finetune-layers", type=int, default=0, help="top backbone layers to fine-tune; 0 = all")
    p.add_argument("--finetune-schedule", default="cosine", choices=["constant", "cosine"],
                   help="cosine: one warm-up epoch to --finetune-lr, then cosine decay to 1%% of it")
    p.add_argument("--patience", type=int, default=0,
                   help="early-stopping patience (epochs); 0 = run every epoch and keep the best on val")
    p.add_argument("--backbone", default="mobilenet_v3_large", choices=sorted(BACKBONES))
    p.add_argument("--camera-augment", action="store_true",
                   help="also vary blur, phone sharpening and JPEG quality per training image (not yet evaluated)")
    p.add_argument("--target-precision", type=float, default=0.95,
                   help="pick the lowest confidence threshold whose accepted predictions reach this accuracy")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--label-smoothing", type=float, default=0.1)
    p.add_argument("--finetune-lr", type=float, default=1e-4)
    p.add_argument("--photo-share", type=float, default=0.7, help="share of each class's weight given to real photos vs video frames")
    p.add_argument("--synthetic-negatives", type=int, default=500, help="blank/flat/noise images added to `other`")
    p.add_argument("--synthetic-share", type=float, default=0.25, help="share of the `other` class weight given to synthetic negatives")
    p.add_argument("--alpha", type=float, default=1.4, help="MobileNetV2 width multiplier (1.0 or 1.4)")
    return p.parse_args()


def load_image(path):
    """EXIF-correct, resize short side to LOAD_SIZE, center crop to square."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im = ImageOps.fit(im, (LOAD_SIZE, LOAD_SIZE), Image.Resampling.BILINEAR)
    return np.asarray(im, dtype=np.uint8)


def group_of(filename):
    """Frames of one video share a group; every other image is its own group (see source_groups)."""
    m = VIDEO_FRAME.match(filename)
    return f"video:{m.group(1)}" if m else filename


def source_groups(rows, data_dir, ml_dir=ML_DIR):
    """Group id per image. Images that share an origin look alike (same visit, light, camera), so they must
    land in the same split or held-out scores are inflated: frames of one video; web photos from one page
    (a blog's tour of one mall); one Commons photographer's photos of one landmark (a series from one
    walk); the loose root files by Facebook album, or else by landmark and pixel size (one camera's shoot)."""
    pages = {f"web/{r['path']}": r["page"] for r in csv.DictReader(open(ml_dir / "web_sources.csv", newline=""))}
    authors = {f"commons/{r['path']}": f"{r['label']}:{r['author']}"
               for r in csv.DictReader(open(ml_dir / "commons_sources.csv", newline=""))}
    groups = []
    for r in rows:
        f = r["filename"]
        if VIDEO_FRAME.match(f):
            groups.append(group_of(f))
        elif f in pages:
            groups.append(f"page:{pages[f]}")
        elif f in authors:
            groups.append(f"commons:{authors[f]}")
        elif "/" not in f and FACEBOOK_PHOTO.match(f):
            groups.append(f"facebook:{r['label']}")
        elif "/" not in f:
            with Image.open(Path(data_dir) / f) as im:
                w, h = im.size
            groups.append(f"shoot:{r['label']}:{min(w, h)}x{max(w, h)}")
        else:
            groups.append(f)
    return groups


def difference_hashes(x):
    """256-bit difference hash of each image's training crop (bit = left pixel darker than its neighbour)."""
    out = np.empty((len(x), 256), np.uint8)
    for i, a in enumerate(x):
        g = Image.fromarray(a[CROP_OFFSET:CROP_OFFSET + IMG_SIZE, CROP_OFFSET:CROP_OFFSET + IMG_SIZE]).convert("L")
        g = np.asarray(g.resize((17, 16), Image.Resampling.BILINEAR), np.int16)
        out[i] = (g[:, 1:] > g[:, :-1]).ravel()
    return out


def merge_near_duplicates(groups, hashes, max_bits=10):
    """Union the groups of near-identical images (e.g. one photo saved by two websites) so a copy can't sit in
    train while its twin is scored in val or test. Returns the merged group ids and the number of merges."""
    parent = {g: g for g in groups}

    def find(g):
        while parent[g] != g:
            parent[g] = parent[parent[g]]
            g = parent[g]
        return g

    h = hashes.astype(np.float32)
    ones = h.sum(1)
    merges = 0
    for start in range(0, len(h), 1024):  # Hamming distance = |a| + |b| - 2 a.b, in blocks to bound memory
        d = ones[start:start + 1024, None] + ones[None, :] - 2 * h[start:start + 1024] @ h.T
        for i, j in zip(*np.where(d <= max_bits)):
            i += start
            if i < j and find(groups[i]) != find(groups[j]):
                parent[find(groups[i])] = find(groups[j])
                merges += 1
    return [find(g) for g in groups], merges


def load_dataset(data_dir, labels_csv, min_per_class):
    rows = list(csv.DictReader(open(labels_csv, newline="")))
    counts = Counter(r["label"] for r in rows)
    labels = sorted(l for l, c in counts.items() if c >= min_per_class)
    dropped = {l: c for l, c in counts.items() if c < min_per_class}
    rows = [r for r in rows if r["label"] in labels]
    x = np.stack([load_image(Path(data_dir) / r["filename"]) for r in rows])
    y = np.array([labels.index(r["label"]) for r in rows])
    groups, merges = merge_near_duplicates(source_groups(rows, data_dir), difference_hashes(x))
    print(f"{len(set(groups))} source groups ({merges} merged as near-duplicates)")
    source = np.array(["video" if VIDEO_FRAME.match(r["filename"]) else "photo" for r in rows])
    return rows, labels, x, y, groups, source, dropped


def synthetic_negatives(n, seed):
    """Frames that must never be read as a landmark: covered lens / black screen, flat walls and sky,
    blown-out white, gradients, sensor noise and out-of-focus colour blobs. They show no structure, so
    they belong to `other`; without them the model maps featureless input to whichever landmark its
    darkest or plainest training images came from (a black frame scored 87% "ayala_museum")."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:LOAD_SIZE, 0:LOAD_SIZE].astype(np.float32) / (LOAD_SIZE - 1)
    out = np.empty((n, LOAD_SIZE, LOAD_SIZE, 3), np.uint8)
    for i in range(n):
        kind = i % 5
        tone = rng.integers(3)
        c0 = rng.uniform(0, 16, 3) if tone == 0 else rng.uniform(240, 255, 3) if tone == 1 else rng.uniform(0, 255, 3)
        c1 = rng.uniform(0, 255, 3)
        if kind == 0:  # flat colour, often near black or white
            img = np.broadcast_to(c0, (LOAD_SIZE, LOAD_SIZE, 3))
        elif kind == 1:  # linear gradient in a random direction
            a = rng.uniform(0, 2 * np.pi)
            t = np.clip((np.cos(a) * xx + np.sin(a) * yy - min(0, np.cos(a)) - min(0, np.sin(a)))
                        / (abs(np.cos(a)) + abs(np.sin(a))), 0, 1)[..., None]
            img = c0 * (1 - t) + c1 * t
        elif kind == 2:  # radial falloff: a lamp on a wall, vignetted sky
            cy, cx = rng.uniform(0, 1, 2)
            t = np.clip(np.hypot(yy - cy, xx - cx) / rng.uniform(0.4, 1.4), 0, 1)[..., None]
            img = c1 * (1 - t) + c0 * t
        elif kind == 3:  # defocused blobs: a few colours, upsampled smoothly
            g = int(rng.integers(2, 7))
            small = Image.fromarray(rng.uniform(0, 255, (g, g, 3)).astype(np.uint8))
            img = np.asarray(small.resize((LOAD_SIZE, LOAD_SIZE), Image.Resampling.BICUBIC), np.float32)
        else:  # dark sensor noise: lens covered or pocket shot
            img = np.broadcast_to(rng.uniform(0, 24, 3), (LOAD_SIZE, LOAD_SIZE, 3))
        noise = rng.normal(0, rng.uniform(0, 6), (LOAD_SIZE, LOAD_SIZE, 3 if rng.random() < 0.5 else 1))
        out[i] = np.clip(img + noise, 0, 255).astype(np.uint8)
    return out


def group_split(y, groups, source, num_classes, fractions, seed):
    """Per class and per source (real photos, video frames, synthetic), move whole groups into each held-out
    split until it holds ~its fraction. Stratifying by source keeps real photos in every class's val and test
    splits instead of leaving them to chance. A group that would overshoot a split badly is skipped; if every
    group would, the smallest is taken unless it is far too big. Training always keeps at least one group.
    Returns one split index per image: 0 = train, then 1, 2, ... in `fractions` order."""
    rng = random.Random(seed)
    split = np.zeros(len(y), np.int8)
    for c in range(num_classes):
        for src in sorted(set(source[y == c])):
            idx = np.where((y == c) & (source == src))[0]
            by_group = defaultdict(list)
            for i in idx:
                by_group[groups[i]].append(i)
            keys = sorted(by_group)
            rng.shuffle(keys)
            for s, fraction in enumerate(fractions, start=1):
                target, taken = max(1, round(len(idx) * fraction)), 0
                for k in list(keys):
                    if taken >= target or len(keys) == 1:
                        break
                    if taken + len(by_group[k]) > target * 1.5:
                        continue
                    split[by_group[k]] = s
                    taken += len(by_group[k])
                    keys.remove(k)
                if taken == 0 and len(keys) > 1:
                    k = min(keys, key=lambda k: len(by_group[k]))
                    if len(by_group[k]) <= target * 3:
                        split[by_group[k]] = s
                        keys.remove(k)
    return split


# Medium augmentation: the heavier set (perspective, blur, erasing) measured no better on held-out photos.
# The random 224 crop happens per image in make_ds (Keras' RandomCrop picks one offset per batch).
augment = tf.keras.Sequential(
    [
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


def source_weights(y, source, num_classes, photo_share, synthetic_share):
    """Per-sample weights: every class gets equal total weight. Inside a class, synthetic negatives get
    `synthetic_share` of it, and the rest is split `photo_share` real photos / the remainder video frames.
    Without this, a class's 500 video frames drown out its 50 photos and accuracy on real photos (the
    app's actual input) drops."""
    w = np.zeros(len(y))
    for c in range(num_classes):
        cm = y == c
        parts = {s: cm & (source == s) for s in ("photo", "video", "synthetic")}
        present = [s for s, m in parts.items() if m.any()]
        if not present:
            continue
        shares = {"synthetic": synthetic_share if len(present) > 1 else 1.0}
        real = 1.0 - shares["synthetic"] if parts["synthetic"].any() else 1.0
        both = parts["photo"].any() and parts["video"].any()
        shares["photo"] = real * (photo_share if both else 1.0)
        shares["video"] = real * (1 - photo_share if both else 1.0)
        for s in present:
            w[parts[s]] = shares[s] / parts[s].sum()
    return (w * len(y) / w.sum()).astype(np.float32)


def center(images):
    """The centre 224 crop of LOAD_SIZE images: the framing the app sends (preprocess.ts)."""
    return images[:, CROP_OFFSET:CROP_OFFSET + IMG_SIZE, CROP_OFFSET:CROP_OFFSET + IMG_SIZE]


def random_crops(images, rng):
    """An independent random IMG_SIZE crop of each LOAD_SIZE image (Keras' RandomCrop uses one offset per batch)."""
    oy, ox = rng.integers(0, LOAD_SIZE - IMG_SIZE + 1, (2, len(images)))
    return np.stack([a[t:t + IMG_SIZE, l:l + IMG_SIZE] for a, t, l in zip(images, oy, ox)])


def camera_degrade(images, rng, p_blur=0.25, p_sharpen=0.15, p_jpeg=0.5):
    """Camera variation the app's photos have and the curated images may lack: defocus or hand-shake blur, phone
    sharpening, JPEG recompression. Per image, before the Keras augmentations. Without it, a 1.5 px blur cost
    ~7 points of val-photo accuracy and JPEG quality 60 ~6 points."""
    out = np.empty_like(images)
    for i, a in enumerate(images):
        im = Image.fromarray(a)
        r = rng.random()
        if r < p_blur:
            im = im.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 1.5)))
        elif r < p_blur + p_sharpen:
            im = im.filter(ImageFilter.UnsharpMask(radius=rng.uniform(1.0, 2.5), percent=int(rng.uniform(50, 150)), threshold=2))
        if rng.random() < p_jpeg:
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=int(rng.integers(40, 96)))
            im = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")
        out[i] = np.asarray(im)
    return out


def make_ds(x, y, w, training, batch, seed=0, camera_augment=False):
    """Batches are gathered from the in-memory uint8 array by a generator, so large datasets never get
    embedded in the TF graph (from_tensor_slices on >2 GB of images hits the protobuf limit)."""
    rng = np.random.default_rng(seed)

    def gen():
        idx = rng.permutation(len(x)) if training else np.arange(len(x))
        stop = len(idx) - len(idx) % batch if training else len(idx)
        for s in range(0, stop, batch):
            b = idx[s:s + batch]
            if training:
                imgs = random_crops(x[b], rng)
                yield (camera_degrade(imgs, rng) if camera_augment else imgs), y[b], w[b]
            else:
                yield center(x[b]), y[b], w[b]

    sig = (tf.TensorSpec((None, IMG_SIZE, IMG_SIZE, 3), tf.uint8), tf.TensorSpec((None,), tf.int64),
           tf.TensorSpec((None,), tf.float32))
    ds = tf.data.Dataset.from_generator(gen, output_signature=sig)
    if training:
        ds = ds.map(lambda a, b, c: (augment(tf.cast(a, tf.float32), training=True), b, c), num_parallel_calls=tf.data.AUTOTUNE)
    else:
        ds = ds.map(lambda a, b, c: (tf.cast(a, tf.float32), b, c), num_parallel_calls=tf.data.AUTOTUNE)
    return ds.prefetch(tf.data.AUTOTUNE)


def build_model(num_classes, args):
    make, plus_minus_one = BACKBONES[args.backbone]
    base = make(args)
    base.trainable = False
    inputs = tf.keras.Input((IMG_SIZE, IMG_SIZE, 3), name="image")  # RGB 0-255
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1)(inputs) if plus_minus_one else inputs
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
    """Label-smoothed cross-entropy on logits for integer labels, one loss per image. Keras multiplies
    these by the sample weights before averaging; a loss that averages first makes the weights a no-op."""
    def loss(y, logits):
        onehot = tf.one_hot(tf.cast(tf.reshape(y, [-1]), tf.int32), num_classes)
        return tf.keras.losses.categorical_crossentropy(onehot, logits, from_logits=True, label_smoothing=smoothing)
    return loss


def finetune_learning_rate(args, steps_per_epoch):
    """Constant --finetune-lr, or (cosine) one warm-up epoch from a tenth of it up to it, then cosine decay to 1%."""
    if args.finetune_schedule != "cosine":
        return args.finetune_lr
    total, warmup = args.finetune_epochs * steps_per_epoch, steps_per_epoch
    return tf.keras.optimizers.schedules.CosineDecay(args.finetune_lr / 10, total - warmup, alpha=0.01,
                                                     warmup_target=args.finetune_lr, warmup_steps=warmup)


def train(model, base, train_ds, val_ds, num_classes, args, steps_per_epoch):
    """Returns the (head, finetune) epochs whose weights were kept.

    Keeps the epoch with the best sample-weighted val accuracy (real photos carry most of the weight, as in
    the app), not val loss: fine-tuning keeps improving accuracy while the loss rises from overconfidence,
    and confidence is recalibrated by temperature afterwards anyway."""
    loss = sparse_smoothed_ce(args.label_smoothing, num_classes)
    acc = lambda: [tf.keras.metrics.SparseCategoricalAccuracy(name="weighted_accuracy")]
    cb = lambda: [tf.keras.callbacks.EarlyStopping(monitor="val_weighted_accuracy", mode="max",
                                                   patience=args.patience if args.patience > 0 else 10 ** 9,
                                                   restore_best_weights=True)]

    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss=loss, weighted_metrics=acc())
    h1 = model.fit(train_ds, validation_data=val_ds, epochs=args.head_epochs, callbacks=cb(), verbose=2)

    # Fine-tune the top layers (or all); BatchNorm statistics stay frozen because base runs with training=False.
    base.trainable = True
    if args.finetune_layers > 0:
        for layer in base.layers[:-args.finetune_layers]:
            layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(finetune_learning_rate(args, steps_per_epoch)), loss=loss,
                  weighted_metrics=acc())
    h2 = model.fit(train_ds, validation_data=val_ds, epochs=args.finetune_epochs, callbacks=cb(), verbose=2)
    return tuple(int(np.argmax(h.history["val_weighted_accuracy"])) + 1 for h in (h1, h2))


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


THRESHOLD_GRID = np.round(np.arange(0.30, 0.995, 0.01), 2)


def precision_curve(probs, y, min_accepted):
    """(threshold, accepted images, accuracy of accepted) for each grid threshold with enough answers."""
    pred, conf = probs.argmax(1), probs.max(1)
    rows = []
    for th in THRESHOLD_GRID:
        m = conf >= th
        if m.sum() >= min_accepted:
            rows.append((float(th), int(m.sum()), float((pred[m] == y[m]).mean())))
    return rows


def pick_threshold(probs, y, target, min_accepted=20):
    """Lowest threshold whose accepted predictions reach `target` accuracy, and keep reaching it at every
    higher threshold that still answers `min_accepted` images (so one lucky dip isn't picked).
    Returns None when no threshold qualifies; there is no safe fallback value."""
    best = None
    for th, _, precision in reversed(precision_curve(probs, y, min_accepted)):
        if precision < target:
            break
        best = th
    return best


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
    preds = np.array(preds)
    # The app rejects anything else (scoring.ts); fail here rather than ship a model that trips that.
    if not (np.isfinite(preds).all() and (preds >= 0).all() and np.allclose(preds.sum(1), 1, atol=1e-3)):
        raise SystemExit(f"{path} produced invalid probabilities (NaN, negative, or rows not summing to 1).")
    return preds


def self_check_input(a, b, k, size=IMG_SIZE):
    """Fixed synthetic image: pixel (x, y, channel c) = ((x*a + y*b) * (c+1) + k) mod 256. Integer arithmetic,
    so the app (selfCheckInput in self-check.ts) builds exactly the same tensor."""
    yy, xx = np.mgrid[0:size, 0:size]
    return (((xx[..., None] * a + yy[..., None] * b) * (np.arange(3) + 1) + k) % 256).astype(np.float32)


def self_check_reference(path, tolerance=0.1, min_margin=0.3):
    """A self-check input and this model's CPU output for it. The app runs the same input after loading the
    model with a GPU / Core ML delegate and falls back to CPU if the answer differs (a delegate can load fine
    yet compute wrongly). The input is chosen so its top class leads by `min_margin`, keeping the comparison
    stable under the delegates' lower-precision arithmetic."""
    for a, b, k in ((a, b, k) for k in (0, 128) for a in range(1, 10) for b in range(1, 10) if a != b):
        p = tflite_predict(path, self_check_input(a, b, k)[None])[0]
        second, first = np.sort(p)[-2:]
        if first - second >= min_margin:
            return {"input": {"a": a, "b": b, "k": k}, "probabilities": [round(float(v), 6) for v in p],
                    "tolerance": tolerance}
    raise SystemExit(f"No self-check input gives {path} a confident answer; the model is suspect.")


def blank_inputs():
    """Featureless 224x224 inputs the shipped model must never accept as a landmark. Independent of the
    synthetic training negatives (fixed values, different noise seed)."""
    rng = np.random.default_rng(20261010)
    flat = {"black": 0, "near_black": 6, "dark_grey": 40, "grey": 128, "light_grey": 200, "near_white": 248,
            "white": 255, "red": (200, 30, 30), "green": (40, 160, 60), "blue": (30, 60, 200),
            "sky": (135, 180, 235), "beige_wall": (220, 205, 180), "asphalt": (70, 70, 75)}
    images = {k: np.broadcast_to(np.array(v, np.float32), (IMG_SIZE, IMG_SIZE, 3)) for k, v in flat.items()}
    images["dark_noise"] = np.clip(rng.normal(5, 3, (IMG_SIZE, IMG_SIZE, 3)), 0, 255)
    images["grey_noise"] = np.clip(rng.normal(128, 6, (IMG_SIZE, IMG_SIZE, 3)), 0, 255)
    return list(images), np.stack(list(images.values())).astype(np.float32)


def print_split(labels, y, source, split):
    """Per class: real photos / video frames in each split."""
    print(f"{'label':32s} " + " ".join(f"{n + ' p/v':>11s}" for n in SPLIT_NAMES))
    for c, l in enumerate(labels):
        cells = [f"{np.sum((y == c) & (split == s) & (source == 'photo'))}/{np.sum((y == c) & (split == s) & (source == 'video'))}"
                 for s in range(len(SPLIT_NAMES))]
        print(f"{l:32s} " + " ".join(f"{c:>11s}" for c in cells))


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

    rows, labels, x, y, groups, source, dropped = load_dataset(args.data_dir, args.labels, args.min_per_class)
    n_cls = len(labels)
    print("classes:", dict(zip(labels, np.bincount(y).tolist())))
    if dropped:
        print(f"skipped (<{args.min_per_class} images):", dropped)
    if args.synthetic_negatives:
        if "other" not in labels:
            raise SystemExit("Synthetic negatives need an `other` class in the labels.")
        syn = synthetic_negatives(args.synthetic_negatives, args.seed + 1)
        x = np.concatenate([x, syn])
        y = np.concatenate([y, np.full(len(syn), labels.index("other"))])
        groups = groups + [f"synthetic:{i}" for i in range(len(syn))]
        source = np.concatenate([source, np.full(len(syn), "synthetic")])
        print(f"added {len(syn)} synthetic negatives to `other`")

    split = group_split(y, groups, source, n_cls, (args.val_fraction, args.test_fraction), args.seed)
    tr, va, te = split == 0, split == 1, split == 2
    print_split(labels, y, source, split)
    weights = lambda m: source_weights(y[m], source[m], n_cls, args.photo_share, args.synthetic_share)

    model, base = build_model(n_cls, args)
    epochs = train(model, base, make_ds(x[tr], y[tr], weights(tr), True, args.batch, camera_augment=args.camera_augment),
                   make_ds(x[va], y[va], weights(va), False, args.batch), n_cls, args, int(tr.sum()) // args.batch)
    print("best epochs (head, finetune):", epochs)

    # Temperature and threshold are fitted on real val images only: synthetic negatives are trivially
    # easy and would inflate the accuracy of accepted answers.
    va_real = va & (source != "synthetic")
    temperature = fit_temperature(predict(tta_logit_model(model), center(x[va_real])), y[va_real])
    eval_model = export_model(model, temperature)
    staged = out / "landmark_model.tflite.staged"
    to_tflite(eval_model, staged)

    # Everything below scores the staged file itself: the exact bytes that ship.
    val_probs = tflite_predict(staged, center(x[va_real]))
    threshold = pick_threshold(val_probs, y[va_real], args.target_precision)
    if threshold is None:
        staged.unlink()
        curve = precision_curve(val_probs, y[va_real], 20)
        best = max(curve, key=lambda r: r[2]) if curve else None
        raise SystemExit(
            f"No confidence threshold reaches {args.target_precision:.0%} accuracy on validation"
            + (f" (best: {best[2]:.1%} at {best[0]} with {best[1]} answers)" if best else " (too few confident answers)")
            + f". Nothing in {out} was changed. Improve the data or lower --target-precision deliberately.")

    test_probs = tflite_predict(staged, center(x[te]))
    y_te, src_te = y[te], source[te]
    real_te = src_te != "synthetic"
    other_idx = labels.index("other") if "other" in labels else -1
    accepts_landmark = lambda p: (p.argmax(1) != other_idx) & (p.max(1) >= threshold)

    blank_names, blanks = blank_inputs()
    blank_probs = tflite_predict(staged, blanks)
    accepted_blanks = {n: f"{labels[p.argmax()]} {p.max():.1%}" for n, p in zip(blank_names, blank_probs)
                       if accepts_landmark(p[None])[0]}

    metrics = {
        "train_images": int(tr.sum()), "val_images": int(va.sum()), "test_images": int(te.sum()),
        "synthetic_negatives": {"train": int((tr & (source == "synthetic")).sum()),
                                "val": int((va & (source == "synthetic")).sum()),
                                "test": int((te & (source == "synthetic")).sum())},
        "temperature": temperature,
        "best_epochs": list(epochs),
        "val_real": report(val_probs, y[va_real], labels, threshold),
        "val_photos_only": report(val_probs, y[va_real], labels, threshold, source[va_real] == "photo"),
        "test_real": report(test_probs, y_te, labels, threshold, real_te),
        "test_photos_only": report(test_probs, y_te, labels, threshold, src_te == "photo"),
        "test_synthetic_accepted_as_landmark": int(accepts_landmark(test_probs[~real_te]).sum()),
        "blank_inputs": {n: f"{labels[p.argmax()]} {p.max():.1%}" for n, p in zip(blank_names, blank_probs)},
        "keras_tflite_max_abs_diff": float(np.abs(predict(eval_model, center(x[va_real])) - val_probs).max()),
    }
    print(json.dumps(metrics, indent=2))

    test_precision = metrics["test_real"]["accuracy_when_answered"]
    failures = []
    if accepted_blanks:
        failures.append(f"blank inputs accepted as a landmark: {accepted_blanks}")
    if metrics["test_synthetic_accepted_as_landmark"]:
        failures.append(f"{metrics['test_synthetic_accepted_as_landmark']} held-out synthetic negatives accepted as a landmark")
    if failures:
        staged.unlink()
        raise SystemExit("Model rejected: " + "; ".join(failures) + f". Nothing in {out} was changed.")
    if test_precision is None or test_precision < args.target_precision:
        # Not fatal (the test split is small and was never used to choose anything), but never silent.
        print(f"WARNING: accepted answers on the untouched test split were {test_precision} correct, "
              f"below the {args.target_precision:.0%} target met on validation.")

    meta = {
        "input": {"shape": [1, IMG_SIZE, IMG_SIZE, 3], "dtype": "float32", "color": "RGB", "range": [0, 255]},
        "output": {"dtype": "float32", "type": "softmax", "temperature_baked_in": temperature},
        "labels": labels,
        "confidence_threshold": threshold,
        "target_precision": args.target_precision,
        "test_precision_when_answered": test_precision,
        "self_check": self_check_reference(staged),
        "skipped_classes": dropped,
        "training_args": {k: v for k, v in vars(args).items() if k not in ("data_dir", "labels", "out")},
        "metrics": metrics,
    }
    tflite_path = out / "landmark_model.tflite"
    os.replace(staged, tflite_path)
    (out / "labels.txt").write_text("\n".join(labels) + "\n")
    with open(out / "split.csv", "w", newline="") as f:  # which images each reported score is based on
        writer = csv.writer(f)
        writer.writerow(["filename", "label", "split", "group"])
        for i, r in enumerate(rows):
            writer.writerow([r["filename"], r["label"], SPLIT_NAMES[split[i]], groups[i]])
    (out / "model_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"threshold={threshold} temperature={temperature} test accuracy when answered={test_precision}")
    print(f"wrote {tflite_path} ({tflite_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
