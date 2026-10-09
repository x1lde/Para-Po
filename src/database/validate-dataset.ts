import type { TransportDataset } from './seed';
import type { PlaceCoordinates } from '@/features/transport/types';

function requireText(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Dataset ${field} must be nonempty text.`);
  }
}

function optionalText(value: string | null, field: string): void {
  if (value !== null) requireText(value, field);
}

function coordinates(place: PlaceCoordinates, id: string): void {
  const { latitude, longitude } = place;
  if (latitude === null && longitude === null) return;
  if (latitude === null || longitude === null ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error(`Dataset coordinates are invalid or incomplete for ${id}.`);
  }
}

function identifiers(rows: readonly { id: string; name: string }[], table: string): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    requireText(row.id, `${table} ID`);
    requireText(row.name, `${table} name`);
    if (row.id !== row.id.trim() || ids.has(row.id)) {
      throw new Error(`Dataset ${table} has a duplicate or whitespace-padded ID: ${row.id}.`);
    }
    ids.add(row.id);
  }
  return ids;
}

/** Validate before reference-table replacement; SQL constraints remain the final guard. */
export function validateDataset(dataset: TransportDataset): void {
  if (!Number.isSafeInteger(dataset.version) || dataset.version < 0) {
    throw new Error('Dataset version must be a nonnegative integer.');
  }
  requireText(dataset.sourceNotes, 'source notes');
  const landmarks = identifiers(dataset.landmarks, 'landmarks');
  const destinations = identifiers(dataset.destinations, 'destinations');
  const points = identifiers(dataset.boardingPoints, 'boarding points');
  const routes = identifiers(dataset.routes, 'routes');
  const labels = new Set<string>();
  for (const landmark of dataset.landmarks) {
    coordinates(landmark, landmark.id);
    optionalText(landmark.classificationLabel, 'classification label');
    if (landmark.classificationLabel !== null) {
      if (labels.has(landmark.classificationLabel)) throw new Error('Dataset classification labels must be unique.');
      labels.add(landmark.classificationLabel);
    }
  }
  for (const place of [...dataset.destinations, ...dataset.boardingPoints]) coordinates(place, place.id);
  for (const route of dataset.routes) {
    if (!destinations.has(route.destinationId)) throw new Error(`Unknown destination for route ${route.id}.`);
    if (!['jeepney', 'bus', 'e-bus'].includes(route.transportationType)) throw new Error(`Invalid vehicle type for ${route.id}.`);
    if (!['pending', 'published-confirmed', 'verified'].includes(route.evidenceStatus)) throw new Error(`Invalid evidence status for ${route.id}.`);
    for (const value of [route.alightingLocation, route.alightingInstructions,
      route.destinationWalkingInstructions, route.sourceReference, route.limitations]) optionalText(value, 'route text');
    if (route.evidenceStatus !== 'pending') {
      if (route.sourceReference === null || route.reviewedOn === null) throw new Error(`Route ${route.id} needs evidence and a review date.`);
    }
    if (route.reviewedOn !== null) {
      const date = new Date(route.reviewedOn);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(route.reviewedOn) || Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== route.reviewedOn) throw new Error(`Invalid review date for ${route.id}.`);
    }
  }
  const routePairs = new Set<string>();
  const orders = new Set<string>();
  for (const link of dataset.routeBoardingPoints) {
    const key = JSON.stringify([link.routeId, link.boardingPointId]);
    const order = JSON.stringify([link.routeId, link.stopOrder]);
    if (!routes.has(link.routeId) || !points.has(link.boardingPointId) || routePairs.has(key) || orders.has(order) ||
        !Number.isSafeInteger(link.stopOrder) || link.stopOrder < 0 || typeof link.boardingVerified !== 'boolean') {
      throw new Error(`Invalid or duplicate route/boarding relationship: ${key}.`);
    }
    optionalText(link.boardingInstructions, 'boarding instructions');
    routePairs.add(key);
    orders.add(order);
  }
  const originPairs = new Set<string>();
  for (const link of dataset.landmarkBoardingPoints) {
    const key = JSON.stringify([link.landmarkId, link.boardingPointId]);
    if (!landmarks.has(link.landmarkId) || !points.has(link.boardingPointId) || originPairs.has(key) ||
        typeof link.accessVerified !== 'boolean') throw new Error(`Invalid or duplicate landmark/boarding relationship: ${key}.`);
    optionalText(link.walkingInstructions, 'origin walking instructions');
    originPairs.add(key);
  }
}
