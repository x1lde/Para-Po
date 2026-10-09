import type { RecognitionResult } from '../types';

// Web build: TensorFlow Lite and the SQLite-backed dataset are native-only (see .native.ts),
// so web users go straight to manual landmark selection.

export function loadLandmarkModel(): Promise<never> {
  return Promise.reject(new Error('Landmark recognition is not available on web.'));
}

export async function recognizeLandmark(_photoUri: string): Promise<RecognitionResult> {
  return { status: 'unavailable', reason: 'unsupported-platform' };
}
