import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { loadLandmarkModel, recognizeLandmark } from '../services/recognition-service';
import type { RecognitionResult, RecognizerState } from '../types';

/** Loads the landmark model when mounted; `recognize` works on photo file URIs. */
export function useLandmarkRecognition(): {
  state: RecognizerState;
  recognize: (photoUri: string) => Promise<RecognitionResult>;
} {
  const [state, setState] = useState<RecognizerState>(
    Platform.OS === 'web' ? { status: 'unavailable', reason: 'unsupported-platform' } : { status: 'loading' }
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    loadLandmarkModel().then(
      () => active && setState({ status: 'ready' }),
      (error: unknown) => active && setState({ status: 'unavailable', reason: 'model-load-failed', error })
    );
    return () => {
      active = false;
    };
  }, []);

  const recognize = useCallback(async (photoUri: string) => {
    const result = await recognizeLandmark(photoUri);
    if (result.status === 'unavailable' && result.reason === 'model-load-failed') {
      setState({ status: 'unavailable', reason: 'model-load-failed', error: result.error });
    } else if (result.status !== 'unavailable') {
      setState({ status: 'ready' });
    }
    return result;
  }, []);

  return { state, recognize };
}
