import type { SQLiteDatabase } from 'expo-sqlite';

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

// Version 0 is intentionally empty. Add only verified pilot data, then bump version.
export const bundledDataset: TransportDataset = {
  version: 0,
  sourceNotes: 'No verified pilot dataset supplied yet.',
  landmarks: [],
  destinations: [],
  boardingPoints: [],
  routes: [],
  routeBoardingPoints: [],
  landmarkBoardingPoints: [],
};

/** Caller must run this inside a transaction with foreign keys enabled. */
export async function seedDatabase(db: SQLiteDatabase, dataset: TransportDataset) {
  if (!Number.isSafeInteger(dataset.version) || dataset.version < 0) {
    throw new Error('Dataset version must be a nonnegative integer.');
  }
  const stored = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM dataset_metadata WHERE id = 1'
  );
  if (stored?.version === dataset.version) return;
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
      'INSERT INTO transportation_routes (id, name, transportation_type, destination_id) VALUES (?, ?, ?, ?)',
      route.id, route.name, route.transportationType, route.destinationId
    );
  }
  for (const point of dataset.routeBoardingPoints) {
    await db.runAsync(
      'INSERT INTO route_boarding_points (route_id, boarding_point_id, stop_order) VALUES (?, ?, ?)',
      point.routeId, point.boardingPointId, point.stopOrder
    );
  }
  for (const point of dataset.landmarkBoardingPoints) {
    await db.runAsync(
      'INSERT INTO landmark_boarding_points (landmark_id, boarding_point_id) VALUES (?, ?)',
      point.landmarkId, point.boardingPointId
    );
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO dataset_metadata (id, version, source_notes) VALUES (1, ?, ?)',
    dataset.version, dataset.sourceNotes
  );
}
