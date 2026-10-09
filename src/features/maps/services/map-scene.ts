import type { PlaceCoordinates, TransportLookupResult } from '@/features/transport/types';
import type { MapCoordinate, MapMarker, MapPlaceReference, MapRouteGeometry, MapScene } from '../types';
import type { LocationFix } from '@/features/location/types';
import { usableFix } from '@/features/location/services/proximity';

// Overview camera only: this is not a user position, stop, or destination pin.
export const MAKATI_OVERVIEW: MapCoordinate = [121.025, 14.56];
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

export function validCoordinate(coordinate: readonly number[]): boolean {
  return coordinate.length === 2 && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]) &&
    Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90;
}

export function toMapCoordinate(place: PlaceCoordinates): MapCoordinate | null {
  if (place.latitude === null || place.longitude === null) return null;
  const coordinate: MapCoordinate = [place.longitude, place.latitude];
  return validCoordinate(coordinate) ? coordinate : null;
}

export function buildMapScene(result: TransportLookupResult, geometries: readonly MapRouteGeometry[] = [], references: readonly MapPlaceReference[] = []): MapScene {
  const scene: MapScene = { markers: [], routes: [], omittedLocations: [] };
  if (result.status === 'unsupported-origin' || result.status === 'unsupported-destination') return scene;
  const seen = new Set<string>();
  const omitted = new Set<string>();
  function add(id: string, name: string, kind: MapMarker['kind'], place: PlaceCoordinates) {
    if (seen.has(id)) return;
    seen.add(id);
    const reference = kind === 'boarding' ? undefined : references.find((item) =>
      `${kind}:${item.placeId}` === id && validCoordinate(item.coordinate) && item.sourceReference.trim());
    const recordedCoordinate = toMapCoordinate(place);
    const coordinate = recordedCoordinate ?? reference?.coordinate;
    if (coordinate) scene.markers.push({ id, name, kind, coordinate,
      approximate: kind !== 'boarding', sourceReference: recordedCoordinate ? undefined : reference?.sourceReference,
      details: kind === 'boarding' ? [] : ['Landmark/site reference, not a boarding stop or exact entrance.'],
    });
    else omitted.add(name);
  }
  add(`origin:${result.origin.id}`, result.origin.name, 'origin', result.origin);
  add(`destination:${result.destination.id}`, result.destination.name, 'destination', result.destination);
  if (!('options' in result)) { scene.omittedLocations = [...omitted]; return scene; }
  for (const marker of scene.markers) marker.routeNames = [...new Set(result.options.map((option) => option.route.name))];
  const eligibleRoutes = new Set(result.options.map((option) => option.route.id));
  for (const option of result.options) {
    const id = `boarding:${option.boardingPoint.id}`;
    if (!option.boardingVerified) {
      if (!seen.has(id)) omitted.add(option.boardingPoint.name);
      continue;
    }
    add(id, option.boardingPoint.name, 'boarding', option.boardingPoint);
    const marker = scene.markers.find((item) => item.id === id);
    if (marker) {
      omitted.delete(option.boardingPoint.name);
      marker.routeNames = [...new Set([...(marker.routeNames ?? []), option.route.name])];
      marker.details = [...new Set([...(marker.details ?? []), ...[option.boardingInstructions, option.originWalkingInstructions].filter((text): text is string => Boolean(text))])];
    }
  }
  const seenRoutes = new Set<string>();
  for (const geometry of geometries) {
    if (eligibleRoutes.has(geometry.routeId) && !seenRoutes.has(geometry.routeId) &&
        geometry.sourceReference.trim() && geometry.coordinates.length >= 2 &&
        geometry.coordinates.every(validCoordinate)) {
      seenRoutes.add(geometry.routeId);
      scene.routes.push(geometry);
    }
  }
  scene.omittedLocations = [...omitted];
  return scene;
}

export function withUserLocation(scene: MapScene, fix: LocationFix | null): MapScene {
  const coordinate = fix ? toMapCoordinate(fix.coordinates) : null;
  if (!coordinate || !fix) return scene;
  return { ...scene, markers: [...scene.markers.filter((marker) => marker.kind !== 'user'), {
    id: 'user-location', kind: 'user', name: usableFix(fix) ? 'Your position' : 'Approximate position',
    coordinate, approximate: !usableFix(fix),
    accuracyMeters: fix.accuracyMeters !== null && Number.isFinite(fix.accuracyMeters) && fix.accuracyMeters >= 0 ? fix.accuracyMeters : undefined,
    details: [fix.accuracyMeters === null ? 'Accuracy unknown.' : `Reported accuracy: about ${Math.round(fix.accuracyMeters)} metres.`, 'Device position; it does not change your selected starting landmark.'],
  }] };
}

export function getMapViewport(scene: MapScene, includeUser = true): { center: MapCoordinate; zoom: number } | { bounds: [number, number, number, number]; padding: { top: number; right: number; bottom: number; left: number } } {
  const coordinates = [...scene.markers.filter((marker) => includeUser || marker.kind !== 'user').map((marker) => marker.coordinate), ...scene.routes.flatMap((route) => route.coordinates)];
  if (coordinates.length === 0) return { center: MAKATI_OVERVIEW, zoom: 13 };
  if (coordinates.length === 1) return { center: coordinates[0], zoom: 15 };
  const west = Math.min(...coordinates.map(([lng]) => lng));
  const east = Math.max(...coordinates.map(([lng]) => lng));
  const south = Math.min(...coordinates.map(([, lat]) => lat));
  const north = Math.max(...coordinates.map(([, lat]) => lat));
  if (west === east && south === north) return { center: coordinates[0], zoom: 15 };
  return { bounds: [west, south, east, north], padding: { top: 60, right: 40, bottom: 60, left: 40 } };
}
