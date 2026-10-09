import { Component, lazy, Suspense, type ReactNode } from 'react';
import { isRunningInExpoGo } from 'expo';
import { ScanFallback, type ScanLandmarkProps } from './ScanFallback';

const CameraScanner = lazy(() => import('./CameraScanner'));
class ScannerBoundary extends Component<ScanLandmarkProps & { children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ScanFallback {...this.props} message="Scanning is unavailable in this build. Choose a landmark manually." /> : this.props.children; }
}

export function ScanLandmark(props: ScanLandmarkProps) {
  if (isRunningInExpoGo()) return <ScanFallback {...props} message="Offline recognition needs an Android build; it is unavailable in Expo Go." />;
  return <ScannerBoundary {...props}><Suspense fallback={<ScanFallback {...props} message="Loading scanner..." />}>
    <CameraScanner {...props} />
  </Suspense></ScannerBoundary>;
}
