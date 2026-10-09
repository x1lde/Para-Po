import * as Location from 'expo-location';
import type { LocationFix, LocationResult } from '../types';
import { usableFix, validCoordinates } from './proximity';

/** Foreground-only, user-initiated fix. Stops its watcher after success, error, or timeout. */
export async function getForegroundLocation(signal?: AbortSignal): Promise<LocationResult> {
  try {
    if (signal?.aborted) return { status: 'unavailable' };
    const permission = await Location.requestForegroundPermissionsAsync();
    if (signal?.aborted) return { status: 'unavailable' };
    if (!permission.granted) return { status: 'denied', canAskAgain: permission.canAskAgain };
    if (!await Location.hasServicesEnabledAsync()) return { status: 'services-disabled' };
    if (signal?.aborted) return { status: 'unavailable' };
    return await new Promise<LocationResult>((resolve) => {
      let finished = false;
      let subscription: Location.LocationSubscription | null = null;
      let best: LocationFix | null = null;
      const finish = (result: LocationResult) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        subscription?.remove();
        resolve(result);
      };
      const timer = setTimeout(() => finish(best ? { status: 'inaccurate', fix: best } : { status: 'timeout' }), 20000);
      const abort = () => finish({ status: 'unavailable' });
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, (position) => {
        const fix: LocationFix = {
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          accuracyMeters: position.coords.accuracy !== null && Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0
            ? position.coords.accuracy : null,
          timestamp: position.timestamp,
        };
        if (!validCoordinates(fix.coordinates) || !Number.isFinite(fix.timestamp) ||
            fix.timestamp > Date.now() + 5000 || Date.now() - fix.timestamp > 120000) return;
        if (!best || (fix.accuracyMeters ?? Infinity) < (best.accuracyMeters ?? Infinity)) best = fix;
        if (usableFix(fix)) finish({ status: 'ready', fix });
      }, () => finish({ status: 'unavailable' })).then((watcher) => {
        subscription = watcher;
        if (finished) watcher.remove();
      }).catch(() => finish({ status: 'unavailable' }));
    });
  } catch {
    return { status: 'unavailable' };
  }
}
