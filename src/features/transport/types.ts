export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Missing coordinates are represented as a null pair, never zero or a guessed pin. */
export interface PlaceCoordinates {
  latitude: number | null;
  longitude: number | null;
}

export interface Landmark extends PlaceCoordinates {
  id: string;
  name: string;
  classificationLabel: string | null;
}

export interface Destination extends PlaceCoordinates {
  id: string;
  name: string;
}

export interface BoardingPoint extends PlaceCoordinates {
  id: string;
  name: string;
}

export type TransportationType = 'jeepney' | 'bus' | 'e-bus';
export type RouteEvidenceStatus = 'pending' | 'published-confirmed' | 'verified';

/** One directional route; evidence and guidance completeness are explicit. */
export interface TransportationRoute {
  id: string;
  name: string;
  transportationType: TransportationType;
  destinationId: string;
  /** Null means not yet recorded, never that no alighting or walking is needed. */
  alightingLocation: string | null;
  alightingInstructions: string | null;
  destinationWalkingInstructions: string | null;
  evidenceStatus: RouteEvidenceStatus;
  sourceReference: string | null;
  reviewedOn: string | null;
  limitations: string | null;
}

export interface RouteBoardingPoint {
  routeId: string;
  boardingPointId: string;
  stopOrder: number;
  /** Direction/signboard and queue guidance specific to this route at this stop. */
  boardingInstructions: string | null;
  /** Review of this directional route's boarding site; can use remote evidence. */
  boardingVerified: boolean;
}

/** Origin access relationship; pending access must not be treated as confirmed. */
export interface LandmarkBoardingPoint {
  landmarkId: string;
  boardingPointId: string;
  walkingInstructions: string | null;
  accessVerified: boolean;
}

export type GuidanceIssue =
  | 'route-evidence-pending'
  | 'origin-access-unconfirmed'
  | 'boarding-location-unconfirmed'
  | 'boarding-coordinates-unavailable'
  | 'origin-walking-guidance-unavailable'
  | 'boarding-guidance-unavailable'
  | 'alighting-guidance-unavailable'
  | 'destination-walking-guidance-unavailable';

export interface BoardingOption {
  route: TransportationRoute;
  boardingPoint: BoardingPoint;
  /** Access from the selected origin landmark to this boarding point. */
  originWalkingInstructions: string | null;
  boardingInstructions: string | null;
  boardingVerified: boolean;
  accessVerified: boolean;
  guidanceIssues: GuidanceIssue[];
}

export type TransportLookupResult =
  | { status: 'unsupported-origin' }
  | { status: 'unsupported-destination' }
  | { status: 'no-routes'; origin: Landmark; destination: Destination }
  | { status: 'already-at-destination'; origin: Landmark; destination: Destination }
  | {
      /** Web-sourced recommendations with explicit remaining uncertainty. */
      status: 'source-based';
      origin: Landmark;
      destination: Destination;
      options: BoardingOption[];
    }
  | {
      status: 'incomplete-guidance';
      origin: Landmark;
      destination: Destination;
      options: BoardingOption[];
    }
  | {
      status: 'available';
      origin: Landmark;
      destination: Destination;
      options: BoardingOption[];
    };
