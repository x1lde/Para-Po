import meta from '@/assets/models/landmark_model.json';
import landmarkModel from '@/assets/models/landmark_model.tflite';

// Bundled on-device landmark classifier (trained in ml/, copied from ml/models/ after each retrain).
// Load with react-native-fast-tflite: loadTensorflowModel(LANDMARK_MODEL_ASSET, delegates).
export const LANDMARK_MODEL_ASSET: number = landmarkModel;

// Input: float32 [1, 224, 224, 3], RGB, raw 0-255 pixels. Normalization, test-time augmentation
// and temperature scaling are inside the model, so do not normalize before inference.
export const MODEL_INPUT_SIZE = meta.input.shape[1];
export const MODEL_LABELS: readonly string[] = meta.labels;
export const CONFIDENCE_THRESHOLD: number = meta.confidence_threshold;
export const NOT_A_LANDMARK_LABEL = 'other';

// Model labels (snake_case, from training) -> app place IDs (src/database/data/pilot-dataset.ts).
const LABEL_TO_PLACE_ID: Readonly<Record<string, string>> = {
  ayala_center: 'ayala-center',
  avida_towers_makati_southpoint: 'avida-makati-southpoint',
  ayala_malls_circuit: 'ayala-malls-circuit',
  st_john_bosco_parish: 'st-john-bosco-parish',
  rcbc_plaza: 'rcbc-plaza',
  sm_makati: 'sm-makati',
  the_landmark_makati: 'landmark-makati',
  greenbelt: 'greenbelt',
  glorietta: 'glorietta',
  powerplant_mall: 'powerplant-mall',
  makati_city_hall: 'makati-city-hall',
  ayala_museum: 'ayala-museum',
  one_ayala: 'one-ayala',
  salcedo_weekend_market: 'salcedo-weekend-market',
};

const unmapped = MODEL_LABELS.filter((label) => label !== NOT_A_LANDMARK_LABEL && !(label in LABEL_TO_PLACE_ID));
if (unmapped.length > 0) {
  throw new Error(`Landmark model labels without a place ID: ${unmapped.join(', ')}`);
}

/** Place ID for a model output index, or null for the "not a supported landmark" class. */
export function placeIdForOutputIndex(index: number): string | null {
  const label = MODEL_LABELS[index];
  if (label === undefined) {
    throw new RangeError(`Model output index ${index} is out of range`);
  }
  return label === NOT_A_LANDMARK_LABEL ? null : LABEL_TO_PLACE_ID[label];
}
