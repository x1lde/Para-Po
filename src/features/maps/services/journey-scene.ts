import { routeOf, type JourneyOption, type JourneyPlan, type PlannerPlace } from '@/features/transport/planner/journey-planner';
import type { MapMarker, MapScene } from '../types';

/** Map markers and route lines for one journey option: start, end, where to board and get off, and the ridden path. */
export function journeyScene(plan: JourneyPlan | null, option: JourneyOption | undefined): MapScene {
  const scene: MapScene = { markers: [], routes: [], omittedLocations: [] };
  if (!plan || plan.status !== 'planned') return scene;
  const place = (kind: 'origin' | 'destination', p: PlannerPlace): MapMarker => ({
    id: `${kind}:${p.id}`, name: p.name, kind, coordinate: [p.lon, p.lat],
    approximate: true, details: [`Landmark/site reference: OpenStreetMap ${p.osm}; exact entrance unconfirmed.`], sourceReference: `https://www.openstreetmap.org/${p.osm}`,
  });
  scene.markers.push(place('origin', plan.origin), place('destination', plan.destination));
  option?.legs.forEach((leg, index) => {
    if (leg.type !== 'ride') return;
    const route = routeOf(leg.route);
    const label = `${route.name}${route.ref ? ` (${route.ref})` : ''}`;
    scene.markers.push(
      { id: `boarding:${index}:board`, name: `Candidate boarding: ${leg.board.name}`, kind: 'boarding', coordinate: [leg.board.lon, leg.board.lat], approximate: true, details: ['Mapped or inferred candidate point. Exact legal loading location and current service are unconfirmed.'], routeNames: [label], sourceReference: route.source },
      { id: `boarding:${index}:alight`, name: `Candidate alighting: ${leg.alight.name}`, kind: 'boarding', coordinate: [leg.alight.lon, leg.alight.lat], approximate: true, details: ['Mapped or inferred candidate point. Exact legal unloading location and final access are unconfirmed.'], routeNames: [label], sourceReference: route.source },
    );
    if (leg.path.length >= 2) scene.routes.push({ routeId: `${leg.route}:${index}`, coordinates: leg.path, sourceReference: route.source });
  });
  return scene;
}

/** Nearest supported landmark to a position, with its straight-line distance in metres. */
export function nearestPlace(places: readonly PlannerPlace[], latitude: number, longitude: number): { place: PlannerPlace; meters: number } | null {
  let best: { place: PlannerPlace; meters: number } | null = null;
  for (const place of places) {
    const meters = haversine(latitude, longitude, place.lat, place.lon);
    if (!best || meters < best.meters) best = { place, meters };
  }
  return best;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const h = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
