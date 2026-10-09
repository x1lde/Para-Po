import type { Coordinates } from '@/features/transport/types';

export interface LocationFix {
  coordinates: Coordinates;
  accuracyMeters: number | null;
  timestamp: number;
}

export type LocationResult =
  | { status: 'ready' | 'inaccurate'; fix: LocationFix }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'services-disabled' | 'timeout' | 'unavailable' };
