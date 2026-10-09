# Landmark recognition

On-device photo → landmark recognition with the bundled TensorFlow Lite model (`assets/models/`,
trained in `ml/`). Runs offline; no network calls.

The Ride screen opens a native camera scanner on demand. It requests camera permission only through the Allow camera control, waits for preview readiness before capture, and sends the captured file URI to the recognition service. Users confirm a recognized landmark; uncertain results offer candidate choices and manual selection. Denied permission, capture failure, model loading failure, malformed scores, and catalog errors retain manual fallback. Web and Expo Go do not load the native inference module. Closing the scanner ignores late capture/inference results and unmounts its camera preview.

Malformed model scores return `inference-failed`; failed SQLite candidate lookups return `catalog-unavailable`. Neither rejects the recognition promise. Camera configuration enables still-photo access without adding Android audio recording permission. Native capture, inference speed, and airplane-mode behavior still require device checks.

Audit-fix validation: TypeScript and lint pass; 10 mocked recognition checks, 13 offline-data checks, 11 map-scene checks, nine mocked location checks, and 13 selection/layout/integration tests pass. Android Hermes and web static exports include the scanner flow and platform fallback. These do not compile the native libraries or validate actual device capture/inference. The recognition check loader normalizes Windows paths so repository mocks resolve consistently.

## Use it

```tsx
import { useLandmarkRecognition } from '@/features/recognition/hooks/use-landmark-recognition';

const { state, recognize } = useLandmarkRecognition(); // loads the model on mount
// state.status: 'loading' | 'ready' | 'unavailable'

const photo = await cameraRef.current?.takePictureAsync(); // expo-camera
const result = await recognize(photo.uri);
```

| `result.status` | Meaning | UI |
|---|---|---|
| `recognized` | Confidence ≥ threshold (accepted answers were ≥95% correct on validation) | Use `result.landmark` as the origin; optionally show `result.candidates` as "not right?" alternatives |
| `uncertain` | Below threshold | Ask "Which landmark are you closest to?" with `result.candidates` (top 3, best first) plus the full manual list |
| `not-a-landmark` | Confidently not a supported Makati landmark | Say so and offer manual selection |
| `unavailable` | Web, model failed to load, unreadable image, or inference error (`result.reason`) | Manual selection |

`recognizeLandmark(uri)` (`services/recognition-service`) is the same thing without React. Results never throw;
every failure is a status. Pass `result.landmark.id` to `lookupTransportation` like a manually chosen landmark.

## How it works

1. **Preprocess** (`services/preprocess.ts`): `expo-image-manipulator` takes a centred square covering 224/256 of
   the short side (the training framing) and resizes it to 224×224. Expo exposes no raw pixels, so the image is
   saved as a quality-1.0 JPEG and decoded with `jpeg-js` into float32 RGB 0–255. Don't normalize: normalization,
   4-view test-time augmentation and temperature calibration are inside the model.
2. **Run** (`services/recognition-service.native.ts`): `react-native-fast-tflite` loads the model once, trying the
   GPU delegate first (Core ML on iOS, `android-gpu` on Android) and falling back to CPU. The input and output
   shapes are checked against `assets/models/landmark_model.json` when the model loads.
3. **Decide** (`services/scoring.ts`): calibrated probabilities and the threshold from the model metadata produce
   one of the statuses above. Candidates never include the model's `other` class.
4. **Map**: model labels are matched to `Landmark.classificationLabel` (`src/database/data/pilot-dataset.ts`). On
   load, the service fails if any model label has no landmark or any landmark label isn't in the model.

The web build uses `recognition-service.ts`, which always returns `unsupported-platform`. TFLite and SQLite are
native-only.

## Native build

`react-native-fast-tflite` (with `react-native-nitro-modules`) has native code, so Expo Go can't run recognition.
Use a development build (`npx expo run:android|ios` or `eas build --profile development`). The config plugin in
`app.json` enables the Core ML delegate and the Android GPU libraries.

## Checks

`npm run check:recognition` covers metadata/label consistency, the decision rules, crop framing, decoding, GPU→CPU
fallback, failure statuses and the web stub, with TFLite, the image manipulator and SQLite mocked.

The TypeScript preprocessing was also checked against the real model. On 42 photos, its output was fed to
the actual `.tflite` and compared with the Python training preprocessing: the top-1 prediction matched 42/42
times, with a maximum probability difference of 0.067. On-device inference itself has not been exercised yet.

## Updating the model

After retraining in `ml/`:
1. Copy `ml/models/landmark_model.tflite` → `assets/models/landmark_model.tflite`.
2. Copy `ml/models/model_meta.json` → `assets/models/landmark_model.json`.
3. If labels changed, update `modelClassificationLabels` in `pilot-dataset.ts` and bump the dataset `version`.
4. Run `npm run check:recognition`.
