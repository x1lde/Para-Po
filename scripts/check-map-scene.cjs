#!/usr/bin/env node
// Synthetic fixtures exercise the production data adapter, not native map rendering.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (modules.has(filename)) return modules.get(filename);
  const api = {};
  modules.set(filename, api);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => load(`${specifier.startsWith('@/')
    ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier)}.ts`);
  vm.runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename })(api, localRequire);
  return api;
}
const api = load(path.join(root, 'src/features/maps/services/map-scene.ts'));
let passed = 0;
function check(name, action) { action(); passed += 1; console.log(`PASS ${name}`); }

const result = {
  status: 'source-based',
  origin: { id: 'test-origin', name: 'TEST origin', latitude: null, longitude: null },
  destination: { id: 'test-destination', name: 'TEST destination', latitude: null, longitude: null },
  options: ['test-a', 'test-b'].map((id) => ({
    route: { id }, boardingVerified: true,
    boardingPoint: { id: 'test-point', name: 'TEST point', latitude: null, longitude: null },
  })),
};
check('longitude/latitude order; null and invalid coordinates rejected', () => {
  assert.deepEqual(api.toMapCoordinate({ latitude: 14.5, longitude: 121 }), [121, 14.5]);
  assert.equal(api.toMapCoordinate({ latitude: null, longitude: null }), null);
  assert.equal(api.toMapCoordinate({ latitude: 14.5, longitude: null }), null);
  assert.equal(api.validCoordinate([181, 14]), false);
  assert.equal(api.validCoordinate([121, 91]), false);
  assert.equal(api.validCoordinate([NaN, 14]), false);
  assert.equal(api.validCoordinate([Infinity, 14]), false);
  assert.equal(api.validCoordinate([0, 0]), true);
});
check('missing locations deduplicated; no fictional markers or connecting line', () => {
  const scene = api.buildMapScene(result);
  assert.deepEqual(scene.markers, []);
  assert.deepEqual(scene.routes, []);
  assert.deepEqual(scene.omittedLocations, ['TEST origin', 'TEST destination', 'TEST point']);
});
check('unconfirmed boarding location withheld even when it has coordinates', () => {
  const fixture = structuredClone(result);
  fixture.options.forEach((option) => {
    option.boardingPoint.latitude = 14.5; option.boardingPoint.longitude = 121;
    option.boardingVerified = false;
  });
  assert.deepEqual(api.buildMapScene(fixture).markers, []);
});
check('confirmed shared boarding point produces one marker', () => {
  const fixture = structuredClone(result);
  fixture.options.forEach((option) => {
    option.boardingPoint.latitude = 14.5; option.boardingPoint.longitude = 121;
  });
  const scene = api.buildMapScene(fixture);
  assert.equal(scene.markers.length, 1);
  assert.equal(scene.markers[0].kind, 'boarding');
  assert.deepEqual(scene.markers[0].coordinate, [121, 14.5]);
});
check('route geometry requires eligible route, provenance and valid vertices', () => {
  const valid = { routeId: 'test-a', sourceReference: 'TEST ONLY source', coordinates: [[121, 14.5], [121.1, 14.6]] };
  const scene = api.buildMapScene(result, [valid, valid,
    { ...valid, routeId: 'not-eligible' },
    { ...valid, routeId: 'test-b', sourceReference: '' },
    { ...valid, routeId: 'test-b', coordinates: [[181, 14], [121, 14]] },
  ]);
  assert.deepEqual(scene.routes, [valid]);
});
check('overview, single point and bounds use actual scene data', () => {
  assert.deepEqual(api.getMapViewport(api.buildMapScene(result)), { center: [121.025, 14.56], zoom: 13 });
  const scene = { markers: [{ coordinate: [121, 14.5] }], routes: [], omittedLocations: [] };
  assert.deepEqual(api.getMapViewport(scene), { center: [121, 14.5], zoom: 15 });
  scene.markers.push({ coordinate: [121.1, 14.6] });
  assert.deepEqual(api.getMapViewport(scene).bounds, [121, 14.5, 121.1, 14.6]);
});
check('published site references remain approximate and cannot fill boarding coordinates', () => {
  const refs = [{ placeId: 'test-origin', coordinate: [121, 14.5], sourceReference: 'TEST site source' },
    { placeId: 'test-point', coordinate: [121.1, 14.6], sourceReference: 'TEST candidate source' }];
  const scene = api.buildMapScene(result, [], refs);
  assert.equal(scene.markers.length, 1);
  assert.equal(scene.markers[0].approximate, true);
  assert.equal(scene.markers[0].kind, 'origin');
});
check('confirmed route-specific boarding can follow an unconfirmed shared-point option', () => {
  const fixture = structuredClone(result);
  fixture.options[0].boardingVerified = false;
  fixture.options[1].boardingPoint.latitude = 14.5;
  fixture.options[1].boardingPoint.longitude = 121;
  assert.equal(api.buildMapScene(fixture).markers.length, 1);
});
check('show journey excludes distant GPS position from journey bounds', () => {
  const scene = { markers: [{ id: 'destination', kind: 'destination', coordinate: [121, 14.5] }], routes: [], omittedLocations: [] };
  const withUser = api.withUserLocation(scene, { coordinates: { latitude: 10, longitude: 124 }, accuracyMeters: 10, timestamp: Date.now() });
  assert.equal(withUser.markers.length, 2);
  assert.deepEqual(api.getMapViewport(withUser, false), { center: [121, 14.5], zoom: 15 });
});
const { accuracyCircle } = load(path.join(root, 'src/features/maps/services/accuracy-circle.ts'));
const { straightLineDistanceMeters } = load(path.join(root, 'src/features/location/services/proximity.ts'));
check('GPS uncertainty polygon is closed and matches reported radius in metres', () => {
  const marker = { kind: 'user', coordinate: [121, 14.5], accuracyMeters: 75 };
  const polygon = accuracyCircle(marker);
  assert.equal(polygon.geometry.type, 'Polygon');
  const ring = polygon.geometry.coordinates[0];
  assert.equal(ring.length, 65);
  assert.deepEqual(ring[0], ring[64]);
  for (const [longitude, latitude] of ring) {
    assert.ok(api.validCoordinate([longitude, latitude]));
    assert.ok(Math.abs(straightLineDistanceMeters({ longitude: 121, latitude: 14.5 }, { longitude, latitude }) - 75) < 0.01);
  }
});
check('GPS uncertainty never uses missing, invalid or non-user accuracy', () => {
  assert.equal(accuracyCircle(undefined), null);
  for (const accuracyMeters of [undefined, null, NaN, Infinity, -1, 0]) {
    assert.equal(accuracyCircle({ kind: 'user', coordinate: [121, 14.5], accuracyMeters }), null);
  }
  assert.equal(accuracyCircle({ kind: 'boarding', coordinate: [121, 14.5], accuracyMeters: 75 }), null);
  assert.equal(accuracyCircle({ kind: 'user', coordinate: [181, 14.5], accuracyMeters: 75 }), null);
});
console.log(`\n${passed} map-scene checks passed; native map rendering not exercised.`);
