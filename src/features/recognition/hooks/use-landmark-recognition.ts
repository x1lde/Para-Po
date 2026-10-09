import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { loadLandmarkModel, recognizeLandmark } from '../services/recognition-service';
import type { RecognitionResult, RecognizerState } from '../types';

/** Loads the landmark model when mounted; `recognize` works on photo file URIs. */
export function useLandmarkRecognition(): {
  state: RecognizerState;
  reload: () => Promise<void>;
  recognize: (photoUri: string) => Promise<RecognitionResult>;
} {
  const mounted = useRef(true);
  const loadRequest = useRef(0);
  const [state, setState] = useState<RecognizerState>(
    Platform.OS === 'web' ? { status: 'unavailable', reason: 'unsupported-platform' } : { status: 'loading' }
  );

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(() => {
    if (Platform.OS === 'web') return Promise.resolve();
    const request = ++loadRequest.current;
    return loadLandmarkModel().then(
      () => {
        if (mounted.current && request === loadRequest.current) setState({ status: 'ready' });
      },
      (error: unknown) => {
        console.warn('Landmark model could not load:', error);
        if (mounted.current && request === loadRequest.current) {
          setState({ status: 'unavailable', reason: 'model-load-failed', error });
        }
      }
    );
  }, []);

  const reload = useCallback(() => {
    if (Platform.OS === 'web') return Promise.resolve();
    setState({ status: 'loading' });
    return load();
  }, [load]);

  useEffect(() => {
    void load();
    return () => {
      loadRequest.current += 1;
    };
  }, [load]);

  const recognize = useCallback(async (photoUri: string) => {
    const result = await recognizeLandmark(photoUri);
    if (!mounted.current) return result;
    if (result.status === 'unavailable' && result.reason === 'model-load-failed') {
      setState({ status: 'unavailable', reason: 'model-load-failed', error: result.error });
    } else if (result.status !== 'unavailable') {
      setState({ status: 'ready' });
    }
    return result;
  }, []);

  return { state, recognize, reload };
}
