import type { MapPlaceReference, MapRouteGeometry } from '../types';

// Published building/complex references only, never bus stops or GPS fixes.
export const MAP_PLACE_REFERENCES: readonly MapPlaceReference[] = [
  { placeId: 'ayala-malls-circuit', coordinate: [121.0195608, 14.5729125], sourceReference: 'https://www.google.com/maps/search/?api=1&query=Ayala%20Malls%20Circuit' },
  { placeId: 'one-ayala', coordinate: [121.02789, 14.55051], sourceReference: 'https://mapcarta.com/W270018476' },
  { placeId: 'sm-makati', coordinate: [121.02673, 14.54974], sourceReference: 'https://mapcarta.com/W27831200' },
  { placeId: 'glorietta', coordinate: [121.025278, 14.551111], sourceReference: 'https://www.wikidata.org/wiki/Q5571513' },
  { placeId: 'landmark-makati', coordinate: [121.0237, 14.5522], sourceReference: 'https://ph.pagenation.com/mnl/Landmark_121.0237_14.5522.map' },
  { placeId: 'greenbelt', coordinate: [121.022194, 14.551833], sourceReference: 'https://en.wikipedia.org/wiki/Greenbelt_(shopping_mall)' },
];

// Add only independently sourced vehicle paths matched to lookup route IDs.
// No route polyline is fabricated from the site references above.
export const BUNDLED_ROUTE_GEOMETRIES: readonly MapRouteGeometry[] = [];
