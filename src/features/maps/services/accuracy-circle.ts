import type { Feature, Polygon } from 'geojson';
import type { MapMarker } from '../types';
import { validCoordinate } from './map-scene';

/** Reported GPS uncertainty in metres; this is not a walking range or guarantee. */
export function accuracyCircle(marker: MapMarker | undefined): Feature<Polygon> | null {
  if (!marker || marker.kind !== 'user' || !validCoordinate(marker.coordinate) ||
      marker.accuracyMeters === undefined || !Number.isFinite(marker.accuracyMeters) || marker.accuracyMeters <= 0) return null;
  const [longitude, latitude] = marker.coordinate.map((value) => value * Math.PI / 180);
  const angularDistance = marker.accuracyMeters / 6371000;
  const ring = Array.from({ length: 65 }, (_, index) => {
    const bearing = (index % 64) * 2 * Math.PI / 64;
    const lat = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing));
    const lng = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(lat));
    return [((lng * 180 / Math.PI + 540) % 360) - 180, lat * 180 / Math.PI];
  });
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
