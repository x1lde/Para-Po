export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Landmark extends Coordinates {
  id: string;
  name: string;
  classificationLabel: string;
}

export interface Destination extends Coordinates {
  id: string;
  name: string;
}

export interface BoardingPoint extends Coordinates {
  id: string;
  name: string;
}

export type TransportationType = 'jeepney' | 'bus' | 'e-bus';

/** One direction of a verified route ending at a supported destination. */
export interface TransportationRoute {
  id: string;
  name: string;
  transportationType: TransportationType;
  destinationId: string;
  /** Null means not yet recorded, never that no alighting or walking is needed. */
  alightingLocation: string | null;
  alightingInstructions: string | null;
  destinationWalkingInstructions: string | null;
}

export interface RouteBoardingPoint {
  routeId: string;
  boardingPointId: string;
  stopOrder: number;
  /** Direction/signboard and queue guidance specific to this route at this stop. */
  boardingInstructions: string | null;
}

/** A boarding point verified as accessible from this landmark. */
export interface LandmarkBoardingPoint {
  landmarkId: string;
  boardingPointId: string;
  walkingInstructions: string | null;
}

export interface BoardingOption {
  route: TransportationRoute;
  boardingPoint: BoardingPoint;
  /** Access from the selected origin landmark to this boarding point. */
  originWalkingInstructions: string | null;
  boardingInstructions: string | null;
}

export type TransportLookupResult =
  | { status: 'unsupported-origin' }
  | { status: 'unsupported-destination' }
  | { status: 'no-routes'; origin: Landmark; destination: Destination }
  | {
      status: 'available';
      origin: Landmark;
      destination: Destination;
      options: BoardingOption[];
    };
