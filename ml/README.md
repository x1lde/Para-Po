# Landmark Recognition Model

MobileNetV2 (α=1.4, ImageNet) transfer learning → TensorFlow Lite, for on-device use with `react-native-fast-tflite`.
It recognises 14 Makati landmarks, plus an `other` class for scenes outside the target area.

## Pipeline

```bash
# GPU recommended (~35 min for the full run on an RTX 4050). [and-cuda] ships its own CUDA 12 libs,
# so it works alongside a system CUDA 13 (no TensorFlow release supports CUDA 13 yet).
uv venv --python 3.12 ml/.venv
uv pip install --python ml/.venv/bin/python -r ml/requirements.txt

ml/.venv/bin/python ml/fetch_commons.py                  # CC-licensed photos   -> ~/Documents/trained/commons
ml/.venv/bin/python ml/fetch_web.py                      # web image search     -> ~/Documents/trained/web
ml/.venv/bin/python ml/fetch_web.py --extra --target 400 #   second pass with alternate names
ml/.venv/bin/python ml/fetch_video.py extract            # frames from ml/videos.csv -> ~/Documents/trained/video
ml/.venv/bin/python ml/train.py --data-dir ~/Documents/trained
```

`fetch_google.py` (Google Places photos + Street View aimed at each landmark) is ready, but it needs a `GOOGLE_MAPS_API_KEY` and hasn't been run.

## Data

- `labels.csv` is the curated training set (6,361 images). Paths are relative to the data dir.
- **Images are not in the repo**, because the repo is public and most web and video content is copyrighted. These files record where every image came from, so the set can be rebuilt:
  - `commons_sources.csv`: author and license of each Commons photo
  - `web_sources.csv`: image URL and source page of each web photo
  - `videos.csv`: YouTube ID and title of each source video
- **Video frames.** Walking-tour videos were only approved when the title places them at that exact landmark. For example, "SM Makati Cyberzone" was accepted, but Cyberzone videos from other SM branches were not. Frames are sampled 3 s apart (1 s for the Cyberzone videos), with near-duplicates dropped. Only the bytes for each sampled frame are downloaded, never the whole video.
- **Hand review.** Every image and frame was reviewed by eye before being added. These were dropped:
  - title cards, presenter selfies, food close-ups and menus
  - trading-card close-ups from a Cyberzone event
  - frames where the tour walks outside or into a neighbouring mall
  - other branches and look-alikes, such as Manila City Hall, Ayala Tower One and Ayala Center Cebu
- **`other` class.** These are frames from BGC, Ortigas, Manila City Hall, SM Megamall, Ayala Center Cebu, Quezon City, Pasig, Alabang and Binondo. They let the model answer "not one of our landmarks" instead of forcing a guess.
- **Duplicates.** Near-duplicates are removed across sources with a perceptual hash.

| Label | Images | of which video frames | Held-out recall (photos) |
|---|---|---|---|
| sm_makati (includes **Cyberzone**) | 957 | 917 (337 Cyberzone) | 41% |
| greenbelt | 688 | 483 | 75% |
| one_ayala | 619 | 563 | 77% |
| glorietta | 589 | 493 | 57% |
| other (not a landmark) | 566 | 566 | n/a |
| ayala_malls_circuit | 548 | 416 | 67% |
| the_landmark_makati | 532 | 494 | 73% |
| salcedo_weekend_market | 494 | 381 | 81% |
| powerplant_mall | 481 | 436 | 71% |
| ayala_museum | 325 | 256 | 100% |
| st_john_bosco_parish | 172 | 104 | 75% |
| rcbc_plaza | 139 | 45 | 55% |
| makati_city_hall | 134 | 26 | 94% |
| avida_towers_makati_southpoint | 88 | 49 | 100% |
| ayala_center | 29 | 6 | 33% |

Manila Premiere Wines was removed from the project.

## Training (`train.py`)

1. **Group-aware split.** All frames of a video stay on one side of train/val (1,443 val images, 222 of them real photos). The score therefore measures unseen footage, not near-identical neighbours of training frames.
2. **Photo/video balance.** Each class gets equal total weight. Within a class, real photos get 70% of it and video frames 30%. Without this, a class's ~500 video frames drown out its ~50 photos, and photo accuracy drops from 75% to 62% (tested with frozen-feature probes).
3. **Two-stage training.** The head is trained first, then the top 100 layers are fine-tuned at LR 2e-5, with label smoothing (0.1) and medium augmentation: crop, flip, rotate, zoom, translate, brightness, contrast, saturation and hue. Heavier augmentation (perspective, blur, erasing) tested no better.
4. **Built-in test-time augmentation.** The model averages its prediction over the original view, a mirrored view and two 85% zooms. This is in the exported graph, so the app still sends one image.
5. **Calibration.** A temperature is fitted on validation, and the confidence threshold is chosen so that answers accepted on validation are ≥95% correct.
6. **Final refit.** The model is refit on train + val with the same epoch counts. That refit is the shipped model.

## Results (held-out run; the shipped model is the train+val refit)

| | Real photos (222) | All held-out images (1,443) |
|---|---|---|
| Top-1 | **70%** | 66% |
| Top-3 | **85%** | 86% |
| Answered at ≥ threshold (0.85) | 46% | 30% |
| Accuracy when answered | **97%** | 96% |

On the same held-out video frames, the previous model (1,129 images, no video) scores **33% top-1**, while this model's held-out run scores about **65%**.

The previous README's "85% top-1" isn't comparable: it came from a random split that let near-duplicate images land in both train and validation. The numbers above use a stricter split.

## Outputs (`ml/models/`)

| File | Contents |
|---|---|
| `landmark_model.tflite` | 8.7 MB, fp16 weights, float32 I/O, built-in ops only (no Flex) |
| `labels.txt` | 15 labels; line index = output index |
| `model_meta.json` | input spec, labels, confidence threshold, temperature, metrics |

## App contract

- **Input:** `float32 [1, 224, 224, 3]`, RGB, raw pixel values **0–255**. Normalization, test-time augmentation and temperature are inside the model.
- **Output:** `float32 [1, 15]` calibrated probabilities, in `labels.txt` order.
- **Decision rule** (threshold read from `model_meta.json`):
  - `max(prob) ≥ confidence_threshold` and top label ≠ `other`: use it.
  - Top label is `other`: tell the user this doesn't look like a supported landmark, and offer the landmark picker.
  - Otherwise: ask "which landmark are you closest to?" and show the **top 3 non-`other`** labels. The right answer is in the top 3 85% of the time.
- **Inference cost:** about 4 MobileNetV2 passes per photo, because of the built-in test-time augmentation. That is fine for a shutter-press flow; use a GPU/NNAPI/Core ML delegate if possible.

## Next steps for accuracy

- **Biggest win:** team phone photos. The weak classes are SM Makati exterior shots (41%), Ayala Center (33%, which is really an umbrella for its malls), Glorietta (57%) and RCBC Plaza (55%). About 30 photos each from street level, the way a commuter would hold the phone, would help more than any further scraping.
- **Google Street View:** `fetch_google.py` can add exterior viewpoints of every building once an API key is available.
# Training split regression checks

Run `python -m unittest discover -s ml -p test_dataset_split.py` from the project root. The tests do not load TensorFlow or train a model. They verify deterministic, globally disjoint source groups across multiple seeds using synthetic fixtures and the committed label catalog. Videos shared by different landmark classes are assigned wholly to training or validation. Splitting fails explicitly if every class cannot retain examples on both sides.

`train.py` uses `dataset_split.py` for future training runs. This fix does not retrain, replace, or recalibrate the already bundled model; its existing reported metrics remain associated with the earlier training run.
