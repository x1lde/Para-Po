import meta from '@/assets/models/landmark_model.json';
import landmarkModel from '@/assets/models/landmark_model.tflite';
import { placeIdForLabel } from './place-id';

// Bundled on-device landmark classifier (trained in ml/, copied from ml/models/ after each retrain).
// Load with react-native-fast-tflite: loadTensorflowModel(LANDMARK_MODEL_ASSET, delegates).
export const LANDMARK_MODEL_ASSET: number = landmarkModel;

// Input: float32 [1, 224, 224, 3], RGB, raw 0-255 pixels. Normalization, test-time augmentation
// and temperature scaling are inside the model, so do not normalize before inference.
export const MODEL_INPUT_SIZE = meta.input.shape[1];
export const MODEL_LABELS: readonly string[] = meta.labels;
export const CONFIDENCE_THRESHOLD: number = meta.confidence_threshold;
export { NOT_A_LANDMARK_LABEL } from './place-id';

for (const label of MODEL_LABELS) placeIdForLabel(label);

/** Place ID for a model output index, or null for the "not a supported landmark" class. */
export function placeIdForOutputIndex(index: number): string | null {
  const label = MODEL_LABELS[index];
  if (label === undefined) {
    throw new RangeError(`Model output index ${index} is out of range`);
  }
  return placeIdForLabel(label);
}
