import type { TransportDataset } from '../seed';
import type { TransportationRoute } from '@/features/transport/types';

const places = [
  ['ayala_center', 'Ayala Center'],
  ['avida_makati_southpoint', 'Avida Towers Makati Southpoint'],
  ['ayala_malls_circuit', 'Ayala Malls Circuit'],
  ['st_john_bosco_parish', 'St. John Bosco Parish'],
  ['rcbc_plaza', 'RCBC Plaza'],
  ['sm_makati', 'SM Makati'],
  ['landmark_makati', 'The Landmark Makati'],
  ['greenbelt', 'Greenbelt by Ayala'],
  ['glorietta', 'Glorietta by Ayala'],
  ['powerplant_mall', 'Power Plant Mall'],
  ['makati_city_hall', 'Makati City Hall'],
  ['ayala_museum', 'Ayala Museum'],
  ['one_ayala', 'One Ayala by Ayala Malls'],
  ['salcedo_weekend_market', 'Salcedo Weekend Market'],
] as const;

// Output labels of the bundled recognition model (assets/models/landmark_model.json, from ml/).
// Its extra "other" class means "not a supported landmark" and has no place.
const modelClassificationLabels: Readonly<Record<(typeof places)[number][0], string>> = {
  ayala_center: 'ayala_center',
  avida_makati_southpoint: 'avida_towers_makati_southpoint',
  ayala_malls_circuit: 'ayala_malls_circuit',
  st_john_bosco_parish: 'st_john_bosco_parish',
  rcbc_plaza: 'rcbc_plaza',
  sm_makati: 'sm_makati',
  landmark_makati: 'the_landmark_makati',
  greenbelt: 'greenbelt',
  glorietta: 'glorietta',
  powerplant_mall: 'powerplant_mall',
  makati_city_hall: 'makati_city_hall',
  ayala_museum: 'ayala_museum',
  one_ayala: 'one_ayala',
  salcedo_weekend_market: 'salcedo_weekend_market',
};

const sourceReference = 'https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428';
const accessReference = 'https://thebeat.asia/manila/nomads/explore/ayala-center-malls-guide';
const terminalReference = 'https://www.globe.com.ph/blog/one-ayala-terminal-guide';

// These are recommendation variants of the same bus leg, not additional bus services.
const onwardJourneys = [
  {
    destinationId: 'sm_makati', name: 'SM Makati',
    walk: 'Use the published One Ayala connection to SM Makati. The guide identifies links with SM Store levels 3 and 4.',
  },
  {
    destinationId: 'glorietta', name: 'Glorietta',
    walk: 'Use the elevated connection between One Ayala and Glorietta 5 on level 3. Continue to your chosen Glorietta section.',
  },
  {
    destinationId: 'landmark_makati', name: 'The Landmark Makati',
    walk: 'Continue through Glorietta toward Glorietta 2; the guide identifies a second-level connection to Landmark.',
  },
  {
    destinationId: 'greenbelt', name: 'Greenbelt',
    walk: 'Continue through Glorietta and Landmark. The guide describes a second-level walkway from Landmark to Greenbelt 4; choose your Greenbelt building.',
  },
] as const;

const onwardRoutes = onwardJourneys.map<TransportationRoute>((journey) => ({
  id: `circuit-p2p-via-one-ayala-to-${journey.destinationId.replaceAll('_', '-')}`,
  name: `Circuit to One Ayala P2P, then walk to ${journey.name}`,
  transportationType: 'bus', destinationId: journey.destinationId,
  alightingLocation: 'One Ayala', alightingInstructions: 'Get off at One Ayala; continue on foot to the selected destination.',
  destinationWalkingInstructions: journey.walk,
  evidenceStatus: 'published-confirmed',
  sourceReference: `${sourceReference} | ${accessReference}`,
  reviewedOn: '2026-10-09',
  limitations: 'The bus leg and mall connections have separate published sources; the combined journey has not been field-verified. Exact pickup/unloading points, access hours, and complete bay-to-connector path remain uncertain. The bus does not drop passengers directly at this mall. Published weekday and beep-card conditions require a current check.',
}));

/** Web-sourced pilot suggestions; verification flags and unknown coordinates remain explicit. */
export const pilotDataset: TransportDataset = {
  version: 6,
  sourceNotes: 'Underscore-separated landmark and destination IDs; 14 user-supplied Makati places after removing Manila Premiere Wines due to insufficient training images; 6 web-sourced recommendation records using 2 published directional bus legs and 4 onward walking variants. Sources: April 28 2026 P2P report and February 24 2026 mall connection guide, reviewed 2026-10-09. Combined bus-plus-walk journeys are explicitly assembled from separate sources. Landmark classification labels map recognition model outputs. Unknown coordinates remain null and access/boarding flags remain false. See docs/data/web-recommendations.md. Dataset 6 adds general One Ayala Upper Ground orientation from the March 2026 Globe guide and clarifies the inbound final stop, reviewed 2026-10-10. Exact bay and access remain unconfirmed. No field verification or guaranteed current operation is claimed.',
  landmarks: places.map(([id, name]) => ({
    id, name, latitude: null, longitude: null, classificationLabel: modelClassificationLabels[id],
  })),
  destinations: places.map(([id, name]) => ({ id, name, latitude: null, longitude: null })),
  boardingPoints: [
    { id: 'circuit-cityflats-p2p-loading', name: 'The CityFlats Circuit loading point', latitude: null, longitude: null },
    { id: 'one-ayala-p2p-loading', name: 'One Ayala P2P loading area', latitude: null, longitude: null },
  ],
  routes: [
    {
      id: 'circuit-p2p-to-one-ayala', name: 'Circuit Makati to One Ayala P2P',
      transportationType: 'bus', destinationId: 'one_ayala',
      alightingLocation: 'One Ayala', alightingInstructions: 'Get off at One Ayala, after the published Security Bank stop on Ayala Avenue. Confirm the final stop with the driver.',
      destinationWalkingInstructions: null,
      evidenceStatus: 'published-confirmed', sourceReference, reviewedOn: '2026-10-10',
      limitations: 'Named bus leg is published. Exact loading curb, arrival bay, and pedestrian access remain unconfirmed. The report describes weekday service excluding holidays and beep-card payment; current conditions require confirmation.',
    },
    {
      id: 'circuit-p2p-to-circuit', name: 'One Ayala to Circuit Makati P2P',
      transportationType: 'bus', destinationId: 'ayala_malls_circuit',
      alightingLocation: 'Gallery Drive, Circuit Makati',
      alightingInstructions: 'Get off at Gallery Drive in Circuit Makati.',
      destinationWalkingInstructions: null,
      evidenceStatus: 'published-confirmed', sourceReference: `${sourceReference} | ${terminalReference}`, reviewedOn: '2026-10-10',
      limitations: 'Named bus leg is published. Exact One Ayala loading bay and access to the selected Circuit mall entrance remain unconfirmed. Gallery Drive arrival is distinct from CityFlats return pickup. Current operating conditions require confirmation.',
    },
    ...onwardRoutes,
  ],
  routeBoardingPoints: [
    {
      routeId: 'circuit-p2p-to-one-ayala', boardingPointId: 'circuit-cityflats-p2p-loading',
      stopOrder: 0, boardingInstructions: 'Board the One Ayala-bound P2P at The CityFlats Circuit loading point.',
      boardingVerified: false,
    },
    {
      routeId: 'circuit-p2p-to-circuit', boardingPointId: 'one-ayala-p2p-loading',
      stopOrder: 0, boardingInstructions: 'At One Ayala’s Upper Ground bus/P2P area, ask terminal staff for the Circuit Makati-bound P2P and confirm its current loading bay before boarding. The exact bay is unconfirmed.',
      boardingVerified: false,
    },
    ...onwardRoutes.map((route) => ({
      routeId: route.id, boardingPointId: 'circuit-cityflats-p2p-loading', stopOrder: 0,
      boardingInstructions: 'Board the One Ayala-bound P2P at The CityFlats Circuit loading point.',
      boardingVerified: false,
    })),
  ],
  landmarkBoardingPoints: [
    {
      landmarkId: 'ayala_malls_circuit', boardingPointId: 'circuit-cityflats-p2p-loading',
      walkingInstructions: null, accessVerified: false,
    },
    {
      landmarkId: 'one_ayala', boardingPointId: 'one-ayala-p2p-loading',
      walkingInstructions: null, accessVerified: false,
    },
  ],
};
