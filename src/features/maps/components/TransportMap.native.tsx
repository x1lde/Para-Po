import { Component, lazy, Suspense, type ReactNode } from 'react';
import { isRunningInExpoGo } from 'expo';
import { useNetworkState } from 'expo-network';
import type { TransportMapProps } from '../types';
import { MapStatus } from './MapStatus';

// Expo Go must not evaluate MapLibre's native imports.
const createMapSurface = () => lazy(() => import('./NativeMapSurface'));

class MapBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <MapStatus message="Map unavailable in this build." onRetry={this.props.onRetry} />
      : this.props.children;
  }
}

/** Create lazy components during initialization/retry, never during rendering. */
class RetryableMap extends Component<TransportMapProps> {
  state = { Surface: createMapSurface(), attempt: 0 };
  retry = () => this.setState((previous: typeof this.state) => ({
    Surface: createMapSurface(), attempt: previous.attempt + 1,
  }));
  render() {
    const { Surface, attempt } = this.state;
    return <MapBoundary key={attempt} onRetry={this.retry}>
      <Suspense fallback={<MapStatus message="Loading online map…" loading />}>
        <Surface {...this.props} onRetry={this.retry} />
      </Suspense>
    </MapBoundary>;
  }
}

export function TransportMap(props: TransportMapProps) {
  const network = useNetworkState();
  if (isRunningInExpoGo()) return <MapStatus message="Map unavailable in Expo Go. Use an Android build to view the map." />;
  if (network.isConnected === false || network.isInternetReachable === false) {
    return <MapStatus message="Map unavailable offline. Connect to Wi-Fi or mobile data to view it." />;
  }
  return <RetryableMap {...props} />;
}
