import { TransportMap } from '@/features/maps/components/TransportMap';
import { makatiOverviewScene } from '@/features/maps/services/makati-overview';

/** Native: the app's MapLibre surface (lazy, offline and Expo Go guards included), with the landmark pins. */
export function MakatiMapSurface() {
  return <TransportMap scene={makatiOverviewScene} />;
}
