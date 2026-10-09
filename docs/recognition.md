# Landmark recognition

On-device photo → landmark recognition with the bundled TensorFlow Lite model (`assets/models/`,
trained in `ml/`). Runs offline; no network calls.

The Ride screen opens a native camera scanner on demand. It requests camera permission only through the Allow camera control, waits for preview readiness before capture, and sends the captured file URI to the recognition service. Users confirm a recognized landmark; uncertain results offer candidate choices and manual selection. Denied permission, capture failure, model loading failure, malformed scores, and catalog errors retain manual fallback. Web and Expo Go do not load the native inference module. Closing the scanner ignores late capture/inference results and unmounts its camera preview.

Malformed model scores return `inference-failed`; failed SQLite candidate lookups return `catalog-unavailable`. Neither rejects the recognition promise. Camera configuration enables still-photo access without adding Android audio recording permission. Native capture, inference speed, and airplane-mode behavior still require device checks.

Score validation rejects the entire output if any probability is non-finite or outside 0–1, and rejects invalid confidence thresholds. A corrupted score is never silently discarded while another class is accepted. These checks do not establish recognition accuracy; held-out images and device evaluation remain necessary.

Audit-fix validation: TypeScript and lint pass; 10 mocked recognition checks, 13 offline-data checks, 11 map-scene checks, nine mocked location checks, and 13 selection/layout/integration tests pass. Android Hermes and web static exports include the scanner flow and platform fallback. These do not compile the native libraries or validate actual device capture/inference. The recognition check loader normalizes Windows paths so repository mocks resolve consistently.

## Use it

Recognition recovery update (checks paused): the scanner now shows candidate model confidence for uncertain predictions and also offers supported candidates when the `other` class wins. Every candidate requires explicit user confirmation; no low-confidence prediction is automatically accepted as a starting point. The full manual catalog remains available. Framing guidance asks for a clear centred sign/building with surrounding facade. Unknown inherited object keys cannot resolve as model labels.

The bundled classifier still accepts predictions only at its calibrated 0.85 threshold. Its stored validation metadata reports about 30% answered coverage across all validation images and about 46% on photo-only validation; frequent uncertainty is consistent with that precision-focused threshold and does not itself prove a broken database mapping. These historical metrics are not physical-device accuracy guarantees. Improving recognition beyond recovery requires reviewing failing photographs, preprocessing, and training coverage before retraining/recalibrating. No inference, tests, lint, typecheck, or builds were run for this update at the user's request.

```tsx
import { useLandmarkRecognition } from '@/features/recognition/hooks/use-landmark-recognition';

const { state, recognize } = useLandmarkRecognition(); // loads the model on mount
// state.status: 'loading' | 'ready' | 'unavailable'

const photo = await cameraRef.current?.takePictureAsync(); // expo-camera
const result = await recognize(photo.uri);
```

| `result.status` | Meaning | UI |
|---|---|---|
| `recognized` | Confidence ≥ threshold (chosen on validation for ≥95% correct answers; the shipped model's accuracy on an untouched test split is `test_precision_when_answered` in `landmark_model.json`) | Use `result.landmark` as the origin; optionally show `result.candidates` as "not right?" alternatives |
| `uncertain` | Below threshold | Ask "Which landmark are you closest to?" with `result.candidates` (top 3, best first) plus the full manual list |
| `not-a-landmark` | Confidently not a supported Makati landmark | Say so and offer manual selection |
| `unclear-photo` | Too dark, too bright or featureless (`result.issue`: `too-dark`, `too-bright`, `low-detail`), e.g. a covered lens. The model is not run | Ask for a retake; offer manual selection |
| `unavailable` | Web, model failed to load, unreadable image, invalid model output, or landmark lookup error (`result.reason`) | Manual selection |

`recognizeLandmark(uri)` (`services/recognition-service`) is the same thing without React. Results never throw;
every failure is a status. Pass `result.landmark.id` to `lookupTransportation` like a manually chosen landmark.

## Camera screen

The Camera tab (`/camera`) captures a rear-camera photo and passes its URI to the recognition hook.
A recognized result selects the starting landmark automatically. Uncertain results ask for a candidate
selection; unclear photos ask for a retake; rejected photos and unavailable recognition offer the full bundled manual list. Camera
permission is optional, and web uses manual selection without starting native recognition.
“Plan journey from here” opens the Map tab with the chosen origin; destination selection and transport
lookup use the existing journey flow. The preview unmounts on tab blur and while the app is backgrounded.

Run `npm run check:camera` for screen-handler checks with mocked React/native APIs, including result
selection, the map handoff, permission fallback, duplicate capture and stale captures after blur.
Real camera capture and model inference still need a device development build.

## How it works

1. **Preprocess** (`services/preprocess.ts`): `expo-image-manipulator` takes a centred square covering 224/256 of
   the short side (the training framing) and resizes it to 224×224 in steps (`resizeSteps`): one step of less than
   2× to 224·2ᵏ, then exact halvings, e.g. 2,646 → 1,792 → 896 → 448 → 224 for a 12 MP photo. Android resizes with
   plain bilinear sampling (`Bitmap.createScaledBitmap`), and a single 12× step aliases fine detail like window grids.
   On the phone-resolution photos available, one step cut top-1 from 73% to 45%. The steps matched the antialiased
   resize the model was trained with. Expo exposes no raw pixels, so the image is saved as a quality-1.0 JPEG and
   decoded with `jpeg-js` into float32 RGB 0–255. Don't normalize: normalization, 4-view test-time augmentation and
   temperature calibration are inside the model.
2. **Gate** (`assessPhoto` in `services/preprocess.ts`): frames whose luminance mean is below 6 or above 245, or whose
   spread is below 8 (0–255), are returned as `unclear-photo` without running the model. Every real training image
   has a mean of 9.6–224 and a spread of at least 16.9, so real landmark photos pass. Featureless input is exactly
   where a classifier guesses: the previous model scored a black frame 87% Ayala Museum.
3. **Run** (`services/recognition-service.native.ts`): `react-native-fast-tflite` loads the model once, trying the
   GPU delegate first (Core ML on iOS, `android-gpu` on Android) and falling back to CPU. When the model loads, its
   input and output shapes are checked against `assets/models/landmark_model.json`. It then runs a **self-check**: a
   fixed synthetic image (`services/self-check.ts`) whose CPU output was recorded at training time (`self_check` in
   the metadata) must come back within 0.1 per probability, with the same top class. A delegate that loads but computes
   wrongly is disposed and the next option is tried. A CPU mismatch means the `.tflite` and its metadata don't belong
   together, so recognition reports `model-load-failed` instead of using the wrong labels or threshold. The
   self-check also warms the model up before the first photo.
4. **Decide** (`services/scoring.ts`): the output must be one probability per label, finite, within 0–1 and summing
   to 1 (±0.05 for fp16 delegates); anything else is `unavailable` / `inference-failed`. Valid probabilities and the
   threshold from the model metadata produce one of the statuses above. Candidates never include the `other` class.
5. **Map**: model labels are matched to `Landmark.classificationLabel` (`src/database/data/pilot-dataset.ts`). On
   load, the service fails if any model label has no landmark or any landmark label isn't in the model.

The web build uses `recognition-service.ts`, which always returns `unsupported-platform`. TFLite and SQLite are
native-only.

## Native build

`react-native-fast-tflite` (with `react-native-nitro-modules`) has native code, so Expo Go can't run recognition.
Use a development build (`npx expo run:android|ios` or `eas build --profile development`). The config plugin in
`app.json` enables the Core ML delegate and the Android GPU libraries.

## Checks

`npm run check:recognition` covers metadata/label consistency, the decision rules, output validation (NaN, length,
range, sum), the photo gate, crop framing, the resize steps, decoding, the self-check (a delegate that computes wrongly
falls back to CPU), GPU→CPU fallback, failure statuses and the web stub, with TFLite, the image manipulator and SQLite
mocked. The self-check input built by `self-check.ts`, run through the real `.tflite` in Python, reproduces the
recorded reference to within 1e-6. `ml/.venv/bin/python ml/test_train.py` covers the training-side logic.

The TypeScript side was also checked against the real model. The 1,091 real images in the current model's untouched
test split (`ml/models/split.csv`) went through the app's Android preprocessing: centre crop, the `resizeSteps`
chain as plain bilinear like `Bitmap.createScaledBitmap`, and a quality-1.0 JPEG round trip. They then ran through
the bundled `.tflite` and the app's TypeScript `assessPhoto` and `interpretScores`. There were no invalid outputs,
no real image was flagged as unclear, and all 15 blank inputs were flagged as unclear. Of 172 photos, 97 were
correctly recognized, 4 wrongly recognized and 71 left to the top-3 picker. Of 919 video frames, 134 were correctly
recognized, 11 wrongly; 8 were correctly called not-a-landmark and 3 wrongly.
On-device inference hasn't been exercised on a phone yet. The load-time self-check verifies whichever delegate is used.

## Updating the model

After retraining in `ml/`:
1. Copy `ml/models/landmark_model.tflite` → `assets/models/landmark_model.tflite`.
2. Copy `ml/models/model_meta.json` → `assets/models/landmark_model.json` from the same run. The self-check refuses a
   `.tflite` paired with another run's metadata.
3. If labels changed, update `modelClassificationLabels` in `pilot-dataset.ts` and bump the dataset `version`.
4. Run `npm run check:recognition`.

`train.py` only writes to `ml/models/` when the run passes: a threshold reaching the target precision exists on
validation, the TFLite output is a valid probability vector, and no blank input or held-out synthetic negative is
accepted as a landmark. Otherwise it exits with an error and leaves the previous model in place.
