# Landmark Recognition Model

MobileNetV2 (ImageNet) transfer learning → TensorFlow Lite, for on-device use with `react-native-fast-tflite`.

## Train

```bash
pip install -r ml/requirements.txt
python3 ml/train.py --data-dir ~/Documents/trained
```

- `labels.csv` maps each image in the data dir to a label. Add rows to add data or classes.
- Classes with fewer than `--min-per-class` (default 5) images are skipped and listed in `model_meta.json`.
- Training: frozen-base head training, then fine-tuning of the last 30 layers, with heavy augmentation (crop, flip, rotate, zoom, brightness, contrast).

## Outputs (`ml/models/`)

| File | Contents |
|---|---|
| `landmark_model.tflite` | ~2.5 MB, dynamic-range quantized weights |
| `labels.txt` | one label per line; line index = output index |
| `model_meta.json` | input spec, labels, confidence threshold, validation metrics |

## App contract

- **Input:** `float32 [1, 224, 224, 3]`, RGB, raw pixel values **0–255**. Normalization is inside the model, so don't normalize in JS.
- **Output:** `float32 [1, N]` softmax probabilities, in the order of `labels.txt`.
- **Confidence:** if `max(prob) < confidence_threshold` (0.7), treat the result as unknown and ask the user which landmark they're closest to.

## Current dataset (25 images)

| Label | Images | Status |
|---|---|---|
| `greenbelt` | 11 | trained |
| `ayala_malls_circuit` | 11 | trained |
| `ayala_center` | 2 | skipped (too few) |
| `glorietta` | 1 | skipped (too few) |

5-fold cross-validation on the two trained classes: **21/22 (95%)**. Predictions at ≥0.7 confidence were 18/22 correct, 100% of them; the 4 below the threshold include the one miss.

To cover the rest of the target landmarks, collect about 30 or more varied photos per landmark (different angles, times of day, distances), add them to `labels.csv`, and retrain.
