import meta from '@/assets/models/landmark_model.json';
import landmarkModel from '@/assets/models/landmark_model.tflite';

// Bundled on-device landmark classifier, trained in ml/. After a retrain, copy
// ml/models/landmark_model.tflite and ml/models/model_meta.json (as landmark_model.json) here.
export const LANDMARK_MODEL_ASSET: number = landmarkModel;

// Input: float32 [1, size, size, 3], RGB, raw 0-255 pixels. Normalization, test-time augmentation
// and temperature scaling are inside the model, so pixels must not be normalized before inference.
export const MODEL_INPUT_SIZE: number = meta.input.shape[1];
// Training resized the short side to 256 and center-cropped 224; preprocessing keeps the same framing.
export const MODEL_CENTER_CROP_FRACTION = 224 / 256;

/** Output labels in model output order. Each maps to a landmark via `Landmark.classificationLabel`. */
export const MODEL_LABELS: readonly string[] = meta.labels;
/** At or above this calibrated probability, accepted predictions were >=95% correct on validation. */
export const CONFIDENCE_THRESHOLD: number = meta.confidence_threshold;
/** Model class for scenes that are not a supported landmark; has no landmark row. */
export const NOT_A_LANDMARK_LABEL = 'other';
