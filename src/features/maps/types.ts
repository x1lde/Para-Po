export type MapCoordinate = [longitude: number, latitude: number];

export interface MapMarker {
  id: string;
  name: string;
  kind: 'origin' | 'boarding' | 'destination' | 'user';
  coordinate: MapCoordinate;
  details?: string[];
  routeNames?: string[];
  sourceReference?: string;
  approximate?: boolean;
  accuracyMeters?: number;
}

export interface MapPlaceReference {
  placeId: string;
  coordinate: MapCoordinate;
  sourceReference: string;
}

/** Predefined, sourced vehicle geometry; never computed from stop locations. */
export interface MapRouteGeometry {
  routeId: string;
  coordinates: MapCoordinate[];
  sourceReference: string;
}

export interface MapScene {
  markers: MapMarker[];
  routes: MapRouteGeometry[];
  omittedLocations: string[];
}

export interface TransportMapProps {
  scene: MapScene;
  focusRequest?: number;
  focusMode?: 'journey' | 'user';
  onMarkerPress?: (marker: MapMarker) => void;
  selectedMarkerId?: string;
  selectedRouteId?: string;
}
