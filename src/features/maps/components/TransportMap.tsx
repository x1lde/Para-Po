import type { TransportMapProps } from '../types';
import { MapStatus } from './MapStatus';

/** Web/unsupported-platform fallback; does not import the native map package. */
export function TransportMap(_props: TransportMapProps) {
  return <MapStatus message="Interactive maps are available in the Android app." />;
}
