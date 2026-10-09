import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { isRunningInExpoGo } from 'expo';
import { useNetworkState } from 'expo-network';
import type { TransportMapProps } from '../types';
import { MapStatus } from './MapStatus';

// Expo Go must not evaluate MapLibre's native imports.
const NativeMapSurface = lazy(() => import('./NativeMapSurface'));

class MapBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <MapStatus message="Map unavailable in this build." onRetry={this.props.onRetry} />
      : this.props.children;
  }
}

export function TransportMap({ scene, ...interaction }: TransportMapProps) {
  const network = useNetworkState();
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  if (isRunningInExpoGo()) return <MapStatus message="Map unavailable in Expo Go. Use an Android build to view the map." />;
  if (network.isConnected === false || network.isInternetReachable === false) {
    return <MapStatus message="Map unavailable offline. Connect to Wi-Fi or mobile data to view it." />;
  }
  return (
    <MapBoundary key={attempt} onRetry={retry}>
      <Suspense fallback={<MapStatus message="Loading online map…" loading />}>
        <NativeMapSurface scene={scene} onRetry={retry} {...interaction} />
      </Suspense>
    </MapBoundary>
  );
}
