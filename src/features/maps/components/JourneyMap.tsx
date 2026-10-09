import { TransportMap } from './TransportMap';

/** Native SQLite/MapLibre flow is intentionally not started during web rendering. */
export function JourneyMap() {
  return <TransportMap scene={{ markers: [], routes: [], omittedLocations: [] }} />;
}
