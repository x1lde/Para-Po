import type { BoardingOption, Coordinates } from '@/features/transport/types';
import type { LocationFix } from '../types';

export function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

export function usableFix(fix: LocationFix, now = Date.now()): boolean {
  return validCoordinates(fix.coordinates) && fix.accuracyMeters !== null &&
    Number.isFinite(fix.accuracyMeters) && fix.accuracyMeters >= 0 && fix.accuracyMeters <= 100 &&
    Number.isFinite(fix.timestamp) && fix.timestamp <= now + 5000 && now - fix.timestamp <= 120000;
}

/** Great-circle distance, not a walking route or walking distance. */
export function straightLineDistanceMeters(from: Coordinates, to: Coordinates): number {
  if (!validCoordinates(from) || !validCoordinates(to)) throw new Error('Invalid distance coordinates.');
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLat = radians(to.latitude - from.latitude);
  const deltaLng = radians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(from.latitude)) *
    Math.cos(radians(to.latitude)) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

/** Input must already be filtered by origin/destination lookup. Unknown points stay unranked. */
export function rankBoardingOptions(options: readonly BoardingOption[], fix: LocationFix | null, now = Date.now()) {
  const ranked = options.map((option) => {
    const point = option.boardingPoint;
    const distanceMeters = fix && usableFix(fix, now) && option.boardingVerified &&
      option.route.evidenceStatus !== 'pending' && point.latitude !== null && point.longitude !== null &&
      validCoordinates({ latitude: point.latitude, longitude: point.longitude })
      ? straightLineDistanceMeters(fix.coordinates, { latitude: point.latitude, longitude: point.longitude }) : null;
    return { option, distanceMeters };
  });
  return ranked.sort((a, b) => {
    if (a.distanceMeters === null) return b.distanceMeters === null ? 0 : 1;
    if (b.distanceMeters === null) return -1;
    return a.distanceMeters - b.distanceMeters || a.option.route.id.localeCompare(b.option.route.id);
  });
}
