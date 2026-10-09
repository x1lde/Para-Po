# Landmark Recognition Model

MobileNetV2 (ImageNet) transfer learning → TensorFlow Lite, for on-device use with `react-native-fast-tflite`.

## Pipeline

```bash
pip install -r ml/requirements.txt
python3 ml/fetch_commons.py                 # download Commons photos -> ~/Documents/trained/commons
python3 ml/fetch_commons.py --refresh       # later: re-list Commons to pick up new uploads
python3 ml/train.py --data-dir ~/Documents/trained
```

- `labels.csv` is the curated training set: paths are relative to the data dir, so team photos sit at the root and Commons photos under `commons/<label>/`. Downloaded images are not used until they're added here.
- `commons_sources.csv` lists the author, license and source page of every Commons image used (CC BY / CC BY-SA). Credit them if you show the images.
- Classes with fewer than `--min-per-class` (default 5) images are skipped and listed in `model_meta.json`.
- Training: frozen-base head training, then fine-tuning of the last 30 layers, with augmentation (crop, flip, rotate, zoom, brightness, contrast) and class weights to balance the rarer landmarks.

### Rate limits (`fetch_commons.py`)

The fetcher stays within Wikimedia's limits instead of trying to get around them:
- API calls are batched (50 files per request) and sent with `maxlag`.
- Downloads use standard 500px thumbnails, which come from the cache.
- 4 workers are paced from the server's `x-ratelimit-*` headers and `Retry-After`.
- The listing is cached and existing files are skipped, so runs are resumable.

The full 635-image pull takes about 6 minutes.

## Outputs (`ml/models/`)

| File | Contents |
|---|---|
| `landmark_model.tflite` | ~2.5 MB, dynamic-range quantized weights |
| `labels.txt` | one label per line; line index = output index |
| `model_meta.json` | input spec, labels, confidence threshold, validation metrics |

## App contract

- **Input:** `float32 [1, 224, 224, 3]`, RGB, raw pixel values **0–255**. Normalization is inside the model, so don't normalize in JS.
- **Output:** `float32 [1, N]` softmax probabilities, in the order of `labels.txt`.
- **Confidence:** if `max(prob) < confidence_threshold` (0.7), don't auto-pick. Show the **top 3** labels as the "which landmark are you closest to?" choices; the right answer is in the top 3 about 91% of the time.

## Current dataset (216 images)

Commons photos were reviewed by hand: street-level exteriors and outdoor signage were kept, while interiors, events, food, plaques, generic greenery, burst near-duplicates and cross-class duplicates were dropped (192 of 635 kept).

| Label | Images | 5-fold CV recall |
|---|---|---|
| greenbelt | 34 | 62% |
| ayala_malls_circuit | 33 | 73% |
| makati_city_hall | 33 | 94% |
| st_john_bosco_parish | 29 | 76% |
| ayala_center | 16 | 50% |
| salcedo_weekend_market | 13 | 85% |
| sm_makati | 12 | 92% |
| the_landmark_makati | 12 | 83% |
| glorietta | 10 | 40% |
| rcbc_plaza | 9 | 56% |
| powerplant_mall | 6 | 83% |
| ayala_museum | 5 | 60% |
| one_ayala | 4 | skipped (too few) |
| avida_towers_makati_southpoint | 0 | no open-licensed photos exist |
| manila_premiere_wines | 0 | no open-licensed photos exist |

Metrics:
- **Held-out split** (fine-tuned TFLite model, 43 images): 79% top-1. At ≥0.7 confidence, 63% of photos are answered, and all of those answers were right.
- **5-fold cross-validation** (frozen features, a lower bound): 73% top-1, 91% top-3. At ≥0.7 confidence, 74% of photos are answered, at 87% accuracy.

**Highest-impact next step:** take about 30 phone photos each of Avida Towers Southpoint, Manila Premiere Wines, One Ayala, Glorietta, RCBC Plaza and Ayala Museum. Vary the angle, distance and time of day. Add them to `labels.csv` and retrain.
