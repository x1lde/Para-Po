import { getDatabase } from '../client';
import { getGuidanceIssues, isGuidanceReady, isSourceBasedRecommendation } from '@/features/transport/services/guidance-service';

import type {
  BoardingOption,
  Destination,
  Landmark,
  RouteEvidenceStatus,
  TransportationType,
} from '@/features/transport/types';

export async function listDestinations(): Promise<Destination[]> {
  const db = await getDatabase();
  return db.getAllAsync<Destination>(
    'SELECT id, name, latitude, longitude FROM destinations ORDER BY name COLLATE NOCASE, id'
  );
}

export async function listLandmarks(): Promise<Landmark[]> {
  const db = await getDatabase();
  return db.getAllAsync<Landmark>(
    `SELECT id, name, latitude, longitude, classification_label AS classificationLabel
     FROM landmarks ORDER BY name COLLATE NOCASE, id`
  );
}

export async function findLandmark(id: string): Promise<Landmark | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Landmark>(
    `SELECT id, name, latitude, longitude, classification_label AS classificationLabel
     FROM landmarks WHERE id = ?`, id
  );
}

export async function findDestination(id: string): Promise<Destination | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Destination>(
    'SELECT id, name, latitude, longitude FROM destinations WHERE id = ?', id
  );
}

interface BoardingOptionRow {
  routeId: string;
  routeName: string;
  transportationType: TransportationType;
  destinationId: string;
  alightingLocation: string | null;
  alightingInstructions: string | null;
  destinationWalkingInstructions: string | null;
  evidenceStatus: RouteEvidenceStatus;
  sourceReference: string | null;
  reviewedOn: string | null;
  limitations: string | null;
  boardingVerified: number;
  accessVerified: number;
  originWalkingInstructions: string | null;
  boardingInstructions: string | null;
  boardingPointId: string;
  boardingPointName: string;
  latitude: number | null;
  longitude: number | null;
}

export async function findBoardingOptions(
  landmarkId: string,
  destinationId: string
): Promise<BoardingOption[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<BoardingOptionRow>(
    `SELECT r.id AS routeId, r.name AS routeName,
            r.transportation_type AS transportationType, r.destination_id AS destinationId,
            r.alighting_location AS alightingLocation,
            r.alighting_instructions AS alightingInstructions,
            r.destination_walking_instructions AS destinationWalkingInstructions,
            r.evidence_status AS evidenceStatus, r.source_reference AS sourceReference,
            r.reviewed_on AS reviewedOn, r.limitations,
            rb.boarding_verified AS boardingVerified, lb.access_verified AS accessVerified,
            lb.walking_instructions AS originWalkingInstructions,
            rb.boarding_instructions AS boardingInstructions,
            b.id AS boardingPointId, b.name AS boardingPointName, b.latitude, b.longitude
     FROM transportation_routes r
     JOIN route_boarding_points rb ON rb.route_id = r.id
     JOIN boarding_points b ON b.id = rb.boarding_point_id
     JOIN landmark_boarding_points lb ON lb.boarding_point_id = b.id
     WHERE r.destination_id = ? AND lb.landmark_id = ?
     ORDER BY r.name COLLATE NOCASE, r.id, rb.stop_order, b.id`,
    destinationId, landmarkId
  );
  return rows.map((row) => {
    const option: Omit<BoardingOption, 'guidanceIssues'> = {
      route: {
        id: row.routeId,
        name: row.routeName,
        transportationType: row.transportationType,
        destinationId: row.destinationId,
        alightingLocation: row.alightingLocation,
        alightingInstructions: row.alightingInstructions,
        destinationWalkingInstructions: row.destinationWalkingInstructions,
        evidenceStatus: row.evidenceStatus,
        sourceReference: row.sourceReference,
        reviewedOn: row.reviewedOn,
        limitations: row.limitations,
      },
      boardingPoint: {
        id: row.boardingPointId,
        name: row.boardingPointName,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      originWalkingInstructions: row.originWalkingInstructions,
      boardingInstructions: row.boardingInstructions,
      boardingVerified: row.boardingVerified === 1,
      accessVerified: row.accessVerified === 1,
    };
    return { ...option, guidanceIssues: getGuidanceIssues(option) };
  });
}

/** Include clearly labeled sourced options by default; false restricts to complete guidance. */
export async function listDestinationsForOrigin(landmarkId: string, includeSourceBased = true): Promise<Destination[]> {
  const db = await getDatabase();
  const candidates = await db.getAllAsync<Destination>(
    `SELECT DISTINCT d.id, d.name, d.latitude, d.longitude
     FROM destinations d
     JOIN transportation_routes r ON r.destination_id = d.id
     JOIN route_boarding_points rb ON rb.route_id = r.id
     JOIN landmark_boarding_points lb ON lb.boarding_point_id = rb.boarding_point_id
     WHERE lb.landmark_id = ?
     ORDER BY d.name COLLATE NOCASE, d.id`, landmarkId
  );
  const eligible: Destination[] = [];
  for (const destination of candidates) {
    const options = await findBoardingOptions(landmarkId, destination.id);
    if (options.some((option) => isGuidanceReady(option) ||
        (includeSourceBased && isSourceBasedRecommendation(option)))) eligible.push(destination);
  }
  return eligible;
}

export interface DatasetMetadata {
  version: number;
  sourceNotes: string;
}

export async function getDatasetMetadata(): Promise<DatasetMetadata | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DatasetMetadata>(
    'SELECT version, source_notes AS sourceNotes FROM dataset_metadata WHERE id = 1'
  );
}
