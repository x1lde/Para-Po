import { TransportMap } from './TransportMap';
import { BodyText, Card, RecoveryLink, ScreenFrame } from '@/components/commuter-ui';

/** Native SQLite/MapLibre flow is intentionally not started during web rendering. */
export function JourneyMap() {
  return <ScreenFrame><Card>
    <TransportMap scene={{ markers: [], routes: [], omittedLocations: [] }} />
    <BodyText>Open the Android app for journey maps and on-device boarding guidance. This web preview cannot read your device’s trip catalog.</BodyText>
    <RecoveryLink label="Back to Ride" route="/" />
  </Card></ScreenFrame>;
}
