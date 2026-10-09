# Landmark Recognition Model

MobileNetV3-Large (ImageNet) transfer learning → TensorFlow Lite, for on-device use with `react-native-fast-tflite`.
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
ml/.venv/bin/python ml/test_train.py                     # unit checks for the training logic (no data needed)
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
- **Synthetic negatives.** `train.py` adds 500 generated images to `other` (not stored in `labels.csv`): flat colours (often near black or white), gradients, radial falloff, out-of-focus colour blobs and dark sensor noise. Without them, featureless input fell to whichever landmark had the darkest or plainest training images. The previous model scored a solid black frame **87% Ayala Museum**, above the 0.85 threshold.
- **Duplicates.** Near-duplicates are removed across sources with a perceptual hash.

| Label | Images | of which video frames | Test recall, photos (n) |
|---|---|---|---|
| sm_makati (includes **Cyberzone**) | 957 | 917 (337 Cyberzone) | 33% (6) |
| greenbelt | 688 | 483 | 87% (31) |
| one_ayala | 619 | 563 | 62% (8) |
| glorietta | 589 | 493 | 57% (14) |
| other (not a landmark) | 566 | 566 | n/a |
| ayala_malls_circuit | 548 | 416 | 80% (20) |
| the_landmark_makati | 532 | 494 | 29% (7) |
| salcedo_weekend_market | 494 | 381 | 94% (17) |
| powerplant_mall | 481 | 436 | 90% (10) |
| ayala_museum | 325 | 256 | 80% (10) |
| st_john_bosco_parish | 172 | 104 | 100% (10) |
| rcbc_plaza | 139 | 45 | 93% (14) |
| makati_city_hall | 134 | 26 | 100% (16) |
| avida_towers_makati_southpoint | 88 | 49 | 100% (6) |
| ayala_center | 29 | 6 | 0% (3) |

Manila Premiere Wines was removed from the project.

## Training (`train.py`)

1. **Source-aware train/val/test split (70/15/15).** Images that share an origin stay in one split, so scores measure unseen sources, not near-identical neighbours of training images. That covers frames of one video, web photos from one page (a blog's tour of a mall), one Commons photographer's photos of one landmark (a series from one walk), one Facebook album, one camera shoot among the loose root files, and any near-identical pixels (difference hash). Earlier versions grouped only video frames, so a photographer's 28 near-identical City Hall photos straddled train and test. The split is also stratified by source, so every class has real photos in val and test. Previously, two classes had no val photos at all. Val is used for early stopping, temperature, threshold and choosing between training runs. Test is used for nothing but the final report. `split.csv` records which split each image went to.
2. **Photo/video balance.** Each class gets equal total weight. Within a class, real photos get 70% of it and video frames 30% (in `other`, synthetic negatives get 25% first). Without this, a class's ~500 video frames drown out its ~50 photos. The loss is computed per image so these weights take effect; earlier versions averaged the loss first, which silently made every weight a no-op.
3. **Two-stage training.** The head is trained on the frozen backbone for up to 10 epochs. Then **every** layer is fine-tuned for 25 epochs, with one warm-up epoch to LR 1e-4 and a cosine decay to 1% of it. Each stage keeps its epoch with the best photo-weighted val accuracy. BatchNorm statistics stay frozen. Label smoothing is 0.1, with medium augmentation: a random crop per image, flip, rotate, zoom, translate, brightness, contrast, saturation and hue. The earlier recipe fine-tuned only the top 100 layers at a constant 2e-5. It stopped after one fine-tuning epoch and **underfit**: the model scored only 67% on its own training images. `--camera-augment` (blur, phone sharpening, JPEG recompression) exists but hasn't been evaluated yet (see Next steps).
4. **Built-in test-time augmentation.** The model averages its prediction over the original view, a mirrored view and two 85% zooms. This is in the exported graph, so the app still sends one image.
5. **Calibration.** A temperature is fitted on real validation images, and the confidence threshold is the lowest one at which accepted answers are ≥95% correct and stay ≥95% at every higher threshold. If no threshold qualifies, the run fails instead of falling back to a default.
6. **No refit.** The exported file that was calibrated is the shipped model, so its threshold and test scores describe exactly what the app runs. (Earlier versions refit on train + val and reused the old threshold, which left the shipped model unvalidated.)
7. **Release gates.** The TFLite output must be a valid probability vector, and no blank input (black, white, grey, flat colours, dark noise) or held-out synthetic negative may be accepted as a landmark. `ml/models/` is only written when every gate passes.

## Results (the shipped model, on the untouched test split)

The shipped `landmark_model.tflite` is scored directly. The test split was used for nothing else: not training,
early stopping, temperature, threshold, or choosing between training runs (that used validation only).

| | Real photos (172) | All real test images (1,091) |
|---|---|---|
| Top-1 | **80%** | 60% |
| Top-3 | **91%** | 84% |
| Answered at ≥ threshold (0.83) | **59%** | 24% |
| Accuracy when answered | **96.0%** (97/101) | 93.5% (243/260) |
| Blank inputs / synthetic negatives accepted as a landmark | 0 of 15 / 0 of 75 | |

The threshold is the lowest one at which accepted validation answers were ≥95% correct (95.1% at 0.83). On the
test split, accepted answers on real photos (the app's input) were 96.0% correct. Across all test images,
including ambiguous walking-tour frames, they were 93.5%. That is slightly under the target and wasn't
retuned, because doing so would use the test split. Raise `--target-precision` (e.g. 0.97) if auto-accepting should
be stricter. The app then answers fewer photos outright and shows the top 3 for the rest.

### How this model was chosen (validation only)

Five runs used the same split. Per-photo results on the 173 validation photos (one standard error ≈ 3 points):

| Run | Backbone, recipe | Val photos top-1 / top-3 | Photos answered | All val top-1 | Size |
|---|---|---|---|---|---|
| E1 | MobileNetV2-1.4, previous recipe | 74.0% / 83.8% | 24.9% | 44.6% | 8.7 MB |
| E2 | MobileNetV2-1.4, all layers + cosine | 84.4% / 90.2% | 53.2% | 64.6% | 8.7 MB |
| E3 | EfficientNet-B0, all layers + cosine | 79.8% / 89.0% | 46.2% | 56.2% | 8.1 MB |
| **E4** | **MobileNetV3-Large, all layers + cosine** | **83.8% / 89.0%** | **56.6%** | **63.7%** | **6.0 MB** |

E2 and E4 tie within noise. E4 was chosen as the smaller model (6.0 MB, ~0.9 GFLOPs per photo with test-time
augmentation, vs 8.7 MB and ~2.3 GFLOPs). It was also as robust or more robust under device-style variations of
the validation photos, in 6 of 7. Under the Android resize steps it scored 83.8% vs 80.3%; with JPEG quality 60, 78.0% vs 76.3%.
Frozen-feature probes of nine ImageNet backbones, ConvNeXt-Tiny included, found no gain from bigger models. The
limit is the data, not capacity.

### End-to-end check (app preprocessing)

The 1,091 real test images went through the app's Android pipeline: centre crop, the `resizeSteps` chain as plain
bilinear (like `Bitmap.createScaledBitmap`), and a quality-1.0 JPEG round trip. Then they ran through the bundled
`.tflite` and the app's TypeScript `assessPhoto` and `interpretScores`. Results: 0 invalid outputs, 0 real images
flagged as unclear, and every blank input flagged as unclear. On photos, 97 were correctly recognized, 4 wrongly
recognized and 71 left to the top-3 picker.

## Outputs (`ml/models/`)

| File | Contents |
|---|---|
| `landmark_model.tflite` | 6.0 MB, fp16 weights, float32 I/O, built-in ops only (no Flex) |
| `labels.txt` | 15 labels; line index = output index |
| `model_meta.json` | input spec, labels, confidence threshold, temperature, metrics, training arguments, self-check reference |
| `split.csv` | train/val/test assignment and source group of every image |

## App contract

- **Input:** `float32 [1, 224, 224, 3]`, RGB, raw pixel values **0–255**. Normalization, test-time augmentation and temperature are inside the model.
- **Output:** `float32 [1, 15]` calibrated probabilities, in `labels.txt` order.
- **Resize in steps:** shrink the crop to 224 through steps of at most 2× (`resizeSteps` in `preprocess.ts`). Android's resize is plain bilinear, and one 12× step from a phone photo aliases fine detail. On the phone-resolution photos available (crop ≥ 1,000 px), one step cut top-1 from 73% to 45%, while the steps matched the training resize.
- **Self-check:** after loading with a GPU / Core ML delegate, run the fixed input from `self_check` and compare with its recorded CPU output (tolerance 0.1, same top class). Fall back to CPU if it differs.
- **Photo gate:** reject frames with luminance mean < 6 or > 245, or spread < 8, before inference (`unclear-photo`).
- **Output check:** treat anything that is not a finite probability vector summing to 1 as an inference failure.
- **Decision rule** (threshold read from `model_meta.json`):
  - `max(prob) ≥ confidence_threshold` and top label ≠ `other`: use it.
  - Top label is `other`: tell the user this doesn't look like a supported landmark, and offer the landmark picker.
  - Otherwise: ask "which landmark are you closest to?" and show the **top 3 non-`other`** labels. On test photos the right answer is in the top 3 87% of the time.
- **Inference cost:** 4 MobileNetV3-Large passes per photo (~0.9 GFLOPs), because of the built-in test-time augmentation. That is fine for a shutter-press flow; the app tries the GPU / Core ML delegate first.

## Next steps for accuracy

- **Team phone photos (biggest win).** Weak classes on test photos: The Landmark (29% of 7), SM Makati (33% of 6),
  Glorietta (57% of 14), One Ayala (62% of 8) and Ayala Center (0 of 3; it is really an umbrella for its malls).
  Each test-class figure rests on only 3–31 photos. The dataset has almost no photos at phone resolution: video
  frames are ≤ 450 px, web images ~534 px. About 30 street-level phone photos per weak landmark would help most.
- **Review unidentifiable frames.** Many walking-tour frames show nothing specific to the landmark: a sidewalk on
  the way to Salcedo Market, generic mall corridors, an escalator, a food court. They're labelled with where the
  video was filmed, and they pull the mall classes toward one another (Glorietta ↔ Circuit ↔ One Ayala ↔ SM).
  Removing or relabelling them is a curation call.
- **Camera augmentation.** On validation photos, a 1.5 px blur cost ~7 points and JPEG quality 60 ~6 points.
  `--camera-augment` targets this. Its evaluation run was stopped when the machine ran low on memory, so it is
  untested; keep it only if validation improves.
- **On-device check.** Delegates are verified by the self-check at load time, but real camera capture and GPU /
  Core ML speed haven't been measured on a phone.
- **Google Street View:** `fetch_google.py` can add exterior viewpoints once an API key is available.
