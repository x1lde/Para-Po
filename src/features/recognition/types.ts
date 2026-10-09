import type { Landmark } from '@/features/transport/types';

export interface RecognitionCandidate {
  landmark: Landmark;
  /** Calibrated model probability, 0-1. */
  confidence: number;
}

/**
 * Outcome of recognizing one photo. Only `recognized` may be used as the origin without asking;
 * every other status must fall back to manual landmark selection.
 */
export type RecognitionResult =
  | {
      status: 'recognized';
      landmark: Landmark;
      confidence: number;
      /** Up to 3 most likely landmarks, best first (includes `landmark`). */
      candidates: RecognitionCandidate[];
    }
  | {
      /** Below the confidence threshold: ask "which landmark are you closest to?" with these. */
      status: 'uncertain';
      candidates: RecognitionCandidate[];
    }
  | {
      /** Confidently not one of the supported Makati landmarks. */
      status: 'not-a-landmark';
      confidence: number;
      candidates: RecognitionCandidate[];
    }
  | {
      status: 'unavailable';
      reason: 'unsupported-platform' | 'model-load-failed' | 'image-unreadable' | 'inference-failed';
      error?: unknown;
    };

export type RecognizerState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'unavailable'; reason: 'unsupported-platform' | 'model-load-failed'; error?: unknown };
