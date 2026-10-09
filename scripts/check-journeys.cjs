#!/usr/bin/env node
// Integrity checks for the generated landmark-to-landmark journeys (src/features/transport/planner/makati-journeys.json).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/features/transport/planner/makati-journeys.json'), 'utf8'));
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS ${name}`); };

function load(relative, mocks = {}) {
  const file = path.join(root, relative);
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require){${out}\n})`, { filename: file })(exports, (name) => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(path.resolve(path.dirname(file), name), 'utf8'));
    throw new Error(`unexpected import ${name}`);
  });
  return exports;
}
const haversine = (a, b) => {
  const r = Math.PI / 180, h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const inMakatiArea = (lat, lon) => lat > 14.50 && lat < 14.61 && lon > 120.98 && lon < 121.09;

// The app's landmark list (pilot dataset) must match the planner's places one-to-one.
const datasetSource = fs.readFileSync(path.join(root, 'src/database/data/pilot-dataset.ts'), 'utf8');
const datasetIds = [...datasetSource.matchAll(/^\s+\['([a-z_]+)', '/gm)].map((m) => m[1]);

check('every supported landmark has a mapped position and the same ID as the app dataset', () => {
  assert.equal(data.places.length, 14);
  assert.deepEqual(data.places.map((p) => p.id).sort(), [...datasetIds].sort());
  for (const place of data.places) {
    assert(inMakatiArea(place.lat, place.lon), place.id);
    assert.match(place.osm, /^(node|way|relation)\/\d+$/);
  }
});

check('every ordered pair of different landmarks has at least one recommendation, fastest first', () => {
  const ids = data.places.map((p) => p.id);
  assert.equal(Object.keys(data.journeys).length, ids.length * (ids.length - 1));
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    const journey = data.journeys[`${a}|${b}`];
    assert(journey && journey.options.length >= 1, `${a}|${b}`);
    const minutes = journey.options.map((o) => o.minutes);
    assert.deepEqual(minutes, [...minutes].sort((x, y) => x - y), `${a}|${b} sorted`);
  }
});

check('legs chain from the origin to the destination, with sane distances and times', () => {
  const place = Object.fromEntries(data.places.map((p) => [p.id, p]));
  for (const [key, journey] of Object.entries(data.journeys)) {
    const [a, b] = key.split('|');
    for (const option of journey.options) {
      const legs = option.legs;
      const start = legs[0].type === 'walk' ? legs[0].from : legs[0].board;
      const end = legs.at(-1).type === 'walk' ? legs.at(-1).to : legs.at(-1).alight;
      assert(haversine(start, place[a]) < 5 && haversine(end, place[b]) < 5, `${key}: starts at origin, ends at destination`);
      for (let i = 1; i < legs.length; i += 1) {
        const prev = legs[i - 1].type === 'walk' ? legs[i - 1].to : legs[i - 1].alight;
        const next = legs[i].type === 'walk' ? legs[i].from : legs[i].board;
        assert(haversine(prev, next) < 5, `${key}: leg ${i} starts where leg ${i - 1} ends`);
      }
      assert.equal(option.minutes, legs.reduce((sum, leg) => sum + leg.minutes, 0), key);
      assert.equal(option.walkMeters, legs.filter((l) => l.type === 'walk').reduce((s, l) => s + l.meters, 0), key);
      const rides = legs.filter((l) => l.type === 'ride');
      assert.equal(option.kind, rides.length === 0 ? 'walk' : rides.length === 1 ? 'ride' : 'transfer', key);
      assert(rides.length <= 2, key);
      for (const ride of rides) {
        assert(data.routes[ride.route], `${key}: route ${ride.route} exists`);
        assert(ride.meters >= 400 && ride.minutes > 0, `${key}: ride is long enough to be worth it (400 m in the relaxed fallback)`);
        for (const [lon, lat] of ride.path) assert(inMakatiArea(lat, lon), `${key}: ride path stays near Makati`);
      }
      for (const walk of legs.filter((l) => l.type === 'walk')) assert(walk.meters <= 2600, `${key}: no walk over 2.6 km`);
    }
  }
});

check('routes are city services with a source, and point-to-point buses load at their terminal', () => {
  for (const [id, route] of Object.entries(data.routes)) {
    assert(['jeepney', 'e-jeepney', 'bus', 'p2p', 'uv-express'].includes(route.mode), id);
    assert.match(route.source, /^https:\/\//, id);
    assert.doesNotMatch(route.name, /Lucena|Batangas|Bataan|Mariveles|Tagaytay|Legazpi/, `${id} is not a provincial bus`);
  }
});

check('the planner API returns plans, same-place and unknown results', () => {
  const planner = load('src/features/transport/planner/journey-planner.ts');
  const plan = planner.planJourney('ayala_malls_circuit', 'one_ayala');
  assert.equal(plan.status, 'planned');
  assert.equal(plan.origin.name, 'Ayala Malls Circuit');
  assert(plan.options.some((o) => o.legs.some((l) => l.type === 'ride' && /Circuit Makati–One Ayala P2P/.test(planner.routeOf(l.route).name))));
  assert.equal(planner.planJourney('greenbelt', 'greenbelt').status, 'same-place');
  assert.equal(planner.planJourney('greenbelt', 'nowhere').status, 'unknown-place');
  const near = planner.planJourney('greenbelt', 'glorietta');
  assert.equal(near.options[0].kind, 'walk', 'neighbouring malls: walking is best');
  assert.match(planner.summarizeOption(near.options[0]), /^Walk · about \d+ min · \d+ m walk$/);
  assert.equal(planner.formatDistance(1234), '1.2 km');
  assert.equal(planner.formatDistance(347), '350 m');
});

check('map scene shows start, end, board/alight stops and the ridden path', () => {
  const planner = load('src/features/transport/planner/journey-planner.ts');
  const scene = load('src/features/maps/services/journey-scene.ts', { '@/features/transport/planner/journey-planner': planner });
  const plan = planner.planJourney('powerplant_mall', 'greenbelt');
  const ride = plan.options.find((o) => o.kind === 'ride');
  const s = scene.journeyScene(plan, ride);
  assert.deepEqual(s.markers.map((m) => m.kind), ['origin', 'destination', 'boarding', 'boarding']);
  assert.equal(s.routes.length, 1);
  assert(s.routes[0].coordinates.length >= 2);
  assert.deepEqual(scene.journeyScene(null, undefined).markers, []);
  const nearest = scene.nearestPlace(planner.PLANNER_PLACES, 14.5512, 121.0253);
  assert.equal(nearest.place.id, 'glorietta');
  assert(nearest.meters < 20);
});

console.log(`\n${passed} journey checks passed (${Object.keys(data.journeys).length} landmark pairs, ${Object.keys(data.routes).length} routes).`);
