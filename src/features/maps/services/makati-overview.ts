import { PLANNER_PLACES } from '@/features/transport/planner/journey-planner';
import type { MapScene } from '../types';

/** Overview of the supported Makati landmarks: one pin per place, no routes. */
export const makatiOverviewScene: MapScene = {
  markers: PLANNER_PLACES.map((place) => ({
    id: `place:${place.id}`, name: place.name, kind: 'destination', coordinate: [place.lon, place.lat],
    approximate: false, sourceReference: `https://www.openstreetmap.org/${place.osm}`,
  })),
  routes: [],
  omittedLocations: [],
};
