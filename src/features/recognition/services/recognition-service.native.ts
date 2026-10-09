import { Platform } from 'react-native';
import { loadTensorflowModel, type TensorflowModelDelegate, type TfliteModel } from 'react-native-fast-tflite';

import { findLandmarkByClassificationLabel } from '@/database/repositories/transport-repository';
import { bundledDataset } from '@/database/seed';
import type { Landmark } from '@/features/transport/types';
import {
  CONFIDENCE_THRESHOLD,
  LANDMARK_MODEL_ASSET,
  MODEL_INPUT_SIZE,
  MODEL_LABELS,
  NOT_A_LANDMARK_LABEL,
} from '../model';
import type { RecognitionCandidate, RecognitionResult } from '../types';
import { imageToModelInput } from './preprocess';
import { findLabelMismatches, interpretScores, type LabelScore } from './scoring';

// GPU first (the model runs 4 test-time views per photo); CPU if the delegate is unavailable.
const PREFERRED_DELEGATES: TensorflowModelDelegate[][] =
  Platform.OS === 'ios' ? [['core-ml'], []] : Platform.OS === 'android' ? [['android-gpu'], []] : [[]];

let modelPromise: Promise<TfliteModel> | null = null;
let useCpuOnly = false;
let recognitionQueue: Promise<void> = Promise.resolve();

function assertModelShape(model: TfliteModel) {
  const input = model.inputs[0];
  const output = model.outputs[0];
  const expectedInput = [1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3];
  if (model.inputs.length !== 1 || input.dataType !== 'float32' ||
      input.shape.join(',') !== expectedInput.join(',')) {
    throw new Error(`Unexpected model input ${input?.dataType} [${input?.shape}]; expected float32 [${expectedInput}].`);
  }
  if (model.outputs.length !== 1 || output.dataType !== 'float32' ||
      output.shape[output.shape.length - 1] !== MODEL_LABELS.length) {
    throw new Error(`Model has ${output?.shape} outputs but ${MODEL_LABELS.length} labels.`);
  }
}

function assertLabelsMatchDataset() {
  const { missingLandmarks, unknownToModel } = findLabelMismatches(
    MODEL_LABELS, bundledDataset.landmarks.map((landmark) => landmark.classificationLabel), NOT_A_LANDMARK_LABEL);
  if (missingLandmarks.length > 0 || unknownToModel.length > 0) {
    throw new Error(`Model labels and landmark classification labels differ. No landmark: [${missingLandmarks}]; ` +
      `not in model: [${unknownToModel}].`);
  }
}

async function loadModel(): Promise<TfliteModel> {
  assertLabelsMatchDataset();
  let lastError: unknown;
  for (const delegates of useCpuOnly ? [[]] : PREFERRED_DELEGATES) {
    try {
      const model = await loadTensorflowModel(LANDMARK_MODEL_ASSET, delegates);
      assertModelShape(model);
      return model;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Load (once) and return the landmark model. A failed load is retried on the next call. */
export function loadLandmarkModel(): Promise<TfliteModel> {
  modelPromise ??= loadModel().catch((error: unknown) => {
    modelPromise = null;
    throw error;
  });
  return modelPromise;
}

async function toCandidates(scores: LabelScore[]): Promise<RecognitionCandidate[]> {
  const landmarks = await Promise.all(scores.map((score) => findLandmarkByClassificationLabel(score.label)));
  return scores.flatMap((score, index) => {
    const landmark: Landmark | null = landmarks[index];
    return landmark ? [{ landmark, confidence: score.confidence }] : [];
  });
}

/** Recognize the landmark in a photo (file URI, e.g. from expo-camera takePictureAsync). */
export function recognizeLandmark(photoUri: string): Promise<RecognitionResult> {
  // A closed scanner can leave an invocation running while another opens.
  // A shared TFLite interpreter must never receive concurrent input writes.
  const operation = recognitionQueue.then(() => recognizePhoto(photoUri));
  recognitionQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function recognizePhoto(photoUri: string): Promise<RecognitionResult> {
  let model: TfliteModel;
  try {
    model = await loadLandmarkModel();
  } catch (error) {
    return { status: 'unavailable', reason: 'model-load-failed', error };
  }

  let input: Float32Array;
  try {
    input = await imageToModelInput(photoUri);
  } catch (error) {
    return { status: 'unavailable', reason: 'image-unreadable', error };
  }

  let scores: Float32Array;
  try {
    const [output] = await model.run([input.buffer as ArrayBuffer]);
    scores = new Float32Array(output);
  } catch (error) {
    if (!model.delegates?.length) return { status: 'unavailable', reason: 'inference-failed', error };
    // Some Android GPUs load a delegate successfully but fail on invocation.
    // Retry this same photo on CPU and retain CPU for the rest of the session.
    useCpuOnly = true;
    modelPromise = null;
    try {
      model = await loadLandmarkModel();
      const [output] = await model.run([input.buffer as ArrayBuffer]);
      scores = new Float32Array(output);
    } catch (cpuError) {
      return { status: 'unavailable', reason: 'inference-failed', error: cpuError };
    }
  }

  let decision: ReturnType<typeof interpretScores>;
  try {
    decision = interpretScores(scores, MODEL_LABELS, CONFIDENCE_THRESHOLD, NOT_A_LANDMARK_LABEL);
  } catch (error) {
    return { status: 'unavailable', reason: 'inference-failed', error };
  }
  try {
    const candidates = await toCandidates(decision.candidates);
    if (decision.kind === 'recognized') {
      const [landmark] = await toCandidates([decision.top]);
      // A label with no landmark row cannot be used as an origin; let the user choose instead.
      if (!landmark) return { status: 'uncertain', candidates };
      return { status: 'recognized', landmark: landmark.landmark, confidence: landmark.confidence, candidates };
    }
    if (decision.kind === 'not-a-landmark') {
      return { status: 'not-a-landmark', confidence: decision.confidence, candidates };
    }
    return { status: 'uncertain', candidates };
  } catch (error) {
    return { status: 'unavailable', reason: 'catalog-unavailable', error };
  }
}
