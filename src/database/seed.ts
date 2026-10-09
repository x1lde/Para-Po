import type { SQLiteDatabase } from 'expo-sqlite';
import { pilotDataset } from './data/pilot-dataset';
import { validateDataset } from './validate-dataset';

import type {
  BoardingPoint,
  Destination,
  Landmark,
  LandmarkBoardingPoint,
  RouteBoardingPoint,
  TransportationRoute,
} from '@/features/transport/types';

export interface TransportDataset {
  version: number;
  sourceNotes: string;
  landmarks: readonly Landmark[];
  destinations: readonly Destination[];
  boardingPoints: readonly BoardingPoint[];
  routes: readonly TransportationRoute[];
  routeBoardingPoints: readonly RouteBoardingPoint[];
  landmarkBoardingPoints: readonly LandmarkBoardingPoint[];
}

export const bundledDataset: TransportDataset = pilotDataset;

/** Match reference identities before trusting an installed version marker. */
async function hasReferenceRows(db: SQLiteDatabase, dataset: TransportDataset): Promise<boolean> {
  const tables = [
    { sql: 'SELECT id, classification_label AS label FROM landmarks', fields: ['id', 'label'], expected: dataset.landmarks.map((row) => [row.id, row.classificationLabel]) },
    { sql: 'SELECT id FROM destinations', fields: ['id'], expected: dataset.destinations.map((row) => [row.id]) },
    { sql: 'SELECT id FROM boarding_points', fields: ['id'], expected: dataset.boardingPoints.map((row) => [row.id]) },
    { sql: 'SELECT id, destination_id AS destinationId FROM transportation_routes', fields: ['id', 'destinationId'], expected: dataset.routes.map((row) => [row.id, row.destinationId]) },
    { sql: 'SELECT route_id AS routeId, boarding_point_id AS pointId, stop_order AS stopOrder FROM route_boarding_points', fields: ['routeId', 'pointId', 'stopOrder'], expected: dataset.routeBoardingPoints.map((row) => [row.routeId, row.boardingPointId, row.stopOrder]) },
    { sql: 'SELECT landmark_id AS landmarkId, boarding_point_id AS pointId FROM landmark_boarding_points', fields: ['landmarkId', 'pointId'], expected: dataset.landmarkBoardingPoints.map((row) => [row.landmarkId, row.boardingPointId]) },
  ];
  for (const table of tables) {
    const rows = await db.getAllAsync<Record<string, string | number | null>>(table.sql);
    if (rows.length !== table.expected.length) return false;
    const actual = new Set(rows.map((row) => JSON.stringify(table.fields.map((field) => row[field]))));
    if (!table.expected.every((row) => actual.has(JSON.stringify(row)))) return false;
  }
  return true;
}

/** Caller must use a transaction and enforce/check foreign keys before commit. */
export async function seedDatabase(db: SQLiteDatabase, dataset: TransportDataset) {
  validateDataset(dataset);
  const stored = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM dataset_metadata WHERE id = 1'
  );
  if (stored?.version === dataset.version && await hasReferenceRows(db, dataset)) return;
  if (stored && stored.version > dataset.version) {
    throw new Error('The local dataset is newer than this application supports.');
  }

  // These tables contain bundled reference data only, never user data.
  // Replace a complete dataset atomically so removed routes cannot linger.
  await db.execAsync(`
    DELETE FROM landmark_boarding_points;
    DELETE FROM route_boarding_points;
    DELETE FROM transportation_routes;
    DELETE FROM boarding_points;
    DELETE FROM destinations;
    DELETE FROM landmarks;
  `);
  for (const landmark of dataset.landmarks) {
    await db.runAsync(
      'INSERT INTO landmarks (id, name, latitude, longitude, classification_label) VALUES (?, ?, ?, ?, ?)',
      landmark.id, landmark.name, landmark.latitude, landmark.longitude, landmark.classificationLabel
    );
  }
  for (const destination of dataset.destinations) {
    await db.runAsync(
      'INSERT INTO destinations (id, name, latitude, longitude) VALUES (?, ?, ?, ?)',
      destination.id, destination.name, destination.latitude, destination.longitude
    );
  }
  for (const point of dataset.boardingPoints) {
    await db.runAsync(
      'INSERT INTO boarding_points (id, name, latitude, longitude) VALUES (?, ?, ?, ?)',
      point.id, point.name, point.latitude, point.longitude
    );
  }
  for (const route of dataset.routes) {
    await db.runAsync(
      `INSERT INTO transportation_routes
       (id, name, transportation_type, destination_id, alighting_location,
        alighting_instructions, destination_walking_instructions,
        evidence_status, source_reference, reviewed_on, limitations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      route.id, route.name, route.transportationType, route.destinationId,
      route.alightingLocation, route.alightingInstructions, route.destinationWalkingInstructions,
      route.evidenceStatus, route.sourceReference, route.reviewedOn, route.limitations
    );
  }
  for (const point of dataset.routeBoardingPoints) {
    await db.runAsync(
      `INSERT INTO route_boarding_points
       (route_id, boarding_point_id, stop_order, boarding_instructions, boarding_verified) VALUES (?, ?, ?, ?, ?)`,
      point.routeId, point.boardingPointId, point.stopOrder, point.boardingInstructions, point.boardingVerified ? 1 : 0
    );
  }
  for (const point of dataset.landmarkBoardingPoints) {
    await db.runAsync(
      `INSERT INTO landmark_boarding_points
       (landmark_id, boarding_point_id, walking_instructions, access_verified) VALUES (?, ?, ?, ?)`,
      point.landmarkId, point.boardingPointId, point.walkingInstructions, point.accessVerified ? 1 : 0
    );
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO dataset_metadata (id, version, source_notes) VALUES (1, ?, ?)',
    dataset.version, dataset.sourceNotes
  );
}
