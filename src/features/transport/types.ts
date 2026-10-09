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
}

export interface RouteBoardingPoint {
  routeId: string;
  boardingPointId: string;
  stopOrder: number;
}

/** A boarding point verified as accessible from this landmark. */
export interface LandmarkBoardingPoint {
  landmarkId: string;
  boardingPointId: string;
}

export interface BoardingOption {
  route: TransportationRoute;
  boardingPoint: BoardingPoint;
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
