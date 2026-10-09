# Landmark Recognition Model

MobileNetV2 (α=1.4, ImageNet) transfer learning → TensorFlow Lite, for on-device use with `react-native-fast-tflite`.

## Pipeline

```bash
# GPU (recommended, ~5 min). [and-cuda] ships its own CUDA 12 libs, so it works alongside a system CUDA 13
uv venv --python 3.12 ml/.venv
uv pip install --python ml/.venv/bin/python -r ml/requirements.txt

ml/.venv/bin/python ml/fetch_commons.py    # CC-licensed photos -> ~/Documents/trained/commons
ml/.venv/bin/python ml/fetch_web.py        # web image search  -> ~/Documents/trained/web
ml/.venv/bin/python ml/fetch_web.py --extra --target 400   # second pass with alternate names
ml/.venv/bin/python ml/train.py --data-dir ~/Documents/trained
```

No TensorFlow release supports CUDA 13 yet (2.21 still requires `cu12` wheels), so GPU training uses the bundled CUDA 12 runtime. The driver runs both side by side.

## Data

- `labels.csv` is the curated training set. Paths are relative to the data dir: team photos sit at the root, then `commons/<label>/` and `web/<label>/`. A downloaded image isn't used until it's listed here.
- **Images are not in the repo.** Web images are mostly copyrighted, and the repo is public. To rebuild the set, rerun the fetchers: they record each image's source in `~/Documents/trained/*/` and are resumable.
- `commons_sources.csv` lists the author and license for each Commons image (CC BY / CC BY-SA).
- `web_sources.csv` lists the source image URL and page for each kept web image.
- Every candidate was reviewed by hand before being added to `labels.csv`:
  - **Kept:** exteriors, entrances, signage, and the views a commuter would actually photograph. That includes the One Ayala terminal bays and Jaime Velasquez Park, where Salcedo Market is held.
  - **Dropped:** interiors, food, events, maps, YouTube thumbnails with heavy text, condo listings, and look-alikes. Look-alikes include other Landmark/SM/Ayala branches, Manila City Hall and Ayala Tower One.
  - **Moved:** photos filed under the wrong landmark were relabeled.
  - Near-duplicates are removed by perceptual hash.

| Label | Images | Held-out recall |
|---|---|---|
| greenbelt | 205 | 83% |
| ayala_malls_circuit | 132 | 88% |
| salcedo_weekend_market | 113 | 91% |
| makati_city_hall | 108 | 100% |
| glorietta | 96 | 84% |
| rcbc_plaza | 94 | 79% |
| ayala_museum | 69 | 79% |
| st_john_bosco_parish | 68 | 86% |
| one_ayala | 56 | 73% |
| powerplant_mall | 45 | 78% |
| avida_towers_makati_southpoint | 40 | 100% |
| the_landmark_makati | 38 | 88% |
| sm_makati | 40 | 62% |
| ayala_center | 23 | 100% |
| manila_premiere_wines | 2 | skipped: needs ≥5. Store is in the basement of Cacho Gonzales Bldg, 101 Aguirre St, Legaspi Village; only 2 photos online can be confirmed to show that building |

1,129 images in total. SM Makati includes 13 verified interior shots: the SM Store sections, food court and supermarket. No Cyberzone photo online could be confirmed as the SM Makati branch, because Cyberzone exists in every SM mall. The recall numbers for the smallest classes come from only 5–8 validation photos each, so treat them as rough.

## Results (held-out 20%: 886 train / 223 val, TFLite model)

| Model | Top-1 | Top-3 | Answered at ≥0.7 confidence | Accuracy when answered |
|---|---|---|---|---|
| α=1.0, 216 images (previous) | 79% | n/a | 63% | 100% (only 27 photos) |
| α=1.0, 1,109 images, CPU | 81% | 92% | 71% | 92% |
| α=1.4, 1,109 images, GPU | 87% | 96% | 70% | 97% |
| **α=1.4, 1,129 images, GPU (shipped)** | **85%** | **94%** | **68%** | **97%** |

## Outputs (`ml/models/`)

| File | Contents |
|---|---|
| `landmark_model.tflite` | 8.7 MB, fp16 weights, float32 I/O |
| `labels.txt` | one label per line; line index = output index |
| `model_meta.json` | input spec, labels, confidence threshold, metrics |

## App contract

- **Input:** `float32 [1, 224, 224, 3]`, RGB, raw pixel values **0–255**. Normalization is inside the model, so don't normalize in JS.
- **Output:** `float32 [1, 14]` softmax probabilities, in the order of `labels.txt`.
- **Confidence:** if `max(prob) ≥ 0.7`, use the top label (97% accurate). Otherwise, ask "which landmark are you closest to?" and offer the **top 3** as choices (the right one is in the top 3 96% of the time).

## Next steps for accuracy

- **Weakest classes:** One Ayala (64%) and Glorietta (79%) are the weakest. They are physically connected to SM Makati and Ayala Center, so they look alike. A few dozen team photos of each would help most.
- **Manila Premiere Wines:** this needs photos from the team, since nothing usable exists online.
