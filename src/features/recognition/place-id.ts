/** Maps classifier labels to the IDs used by the bundled SQLite catalog. */
export const NOT_A_LANDMARK_LABEL = 'other';

const LABEL_TO_PLACE_ID: Readonly<Record<string, string>> = {
  avida_towers_makati_southpoint: 'avida_makati_southpoint',
  ayala_center: 'ayala_center',
  ayala_malls_circuit: 'ayala_malls_circuit',
  ayala_museum: 'ayala_museum',
  glorietta: 'glorietta',
  greenbelt: 'greenbelt',
  makati_city_hall: 'makati_city_hall',
  one_ayala: 'one_ayala',
  powerplant_mall: 'powerplant_mall',
  rcbc_plaza: 'rcbc_plaza',
  salcedo_weekend_market: 'salcedo_weekend_market',
  sm_makati: 'sm_makati',
  st_john_bosco_parish: 'st_john_bosco_parish',
  the_landmark_makati: 'landmark_makati',
};

export function placeIdForLabel(label: string): string | null {
  if (label === NOT_A_LANDMARK_LABEL) return null;
  const placeId = LABEL_TO_PLACE_ID[label];
  if (!placeId) throw new RangeError(`Unknown landmark model label: ${label}`);
  return placeId;
}
