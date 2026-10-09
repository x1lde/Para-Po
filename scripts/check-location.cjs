#!/usr/bin/env node
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let passed = 0;
async function check(name, action) { await action(); passed += 1; console.log(`PASS ${name}`); }

function runtime(mock) {
  const cache = new Map();
  const timers = new Set();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename);
    const api = {};
    cache.set(filename, api);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => specifier === 'expo-location' ? mock
      : load(`${path.resolve(path.dirname(filename), specifier)}.ts`);
    vm.runInThisContext(`(function(exports, require, setTimeout, clearTimeout) { ${compiled}\n})`, { filename })(
      api, localRequire, (action) => { timers.add(action); return action; }, (action) => timers.delete(action));
    return api;
  }
  return { load: (relative) => load(path.join(root, relative)), timers };
}
function fixture(overrides = {}) {
  let watchers = 0, removed = 0;
  const mock = {
    Accuracy: { High: 4 },
    requestForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    hasServicesEnabledAsync: async () => true,
    watchPositionAsync: async () => { watchers += 1; return { remove: () => { removed += 1; } }; },
    ...overrides,
  };
  return { ...runtime(mock), mock, counts: () => ({ watchers, removed }) };
}

async function main() {
  const pure = runtime({}).load('src/features/location/services/proximity.ts');
  await check('Haversine distance and invalid coordinates', () => {
    assert.equal(pure.straightLineDistanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
    const distance = pure.straightLineDistanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    assert(Math.abs(distance - 111195) < 2);
    assert.throws(() => pure.straightLineDistanceMeters({ latitude: NaN, longitude: 0 }, { latitude: 0, longitude: 0 }));
  });
  await check('quality/freshness guard and eligible-only distance ranking', () => {
    const now = Date.now(), fix = { coordinates: { latitude: 14.5, longitude: 121 }, accuracyMeters: 10, timestamp: now };
    const option = (id, latitude, verified = true) => ({ route: { id, evidenceStatus: 'published-confirmed' },
      boardingVerified: verified, boardingPoint: { latitude, longitude: 121 } });
    const ranked = pure.rankBoardingOptions([option('far', 14.6), option('unknown', null), option('near', 14.51), option('unconfirmed', 14.5001, false)], fix, now);
    assert.deepEqual(ranked.map((row) => row.option.route.id), ['near', 'far', 'unknown', 'unconfirmed']);
    assert.equal(ranked[2].distanceMeters, null);
    assert(pure.rankBoardingOptions([option('near', 14.51)], { ...fix, accuracyMeters: 500 }, now).every((row) => row.distanceMeters === null));
    assert.equal(pure.usableFix({ ...fix, timestamp: now - 121000 }, now), false);
  });
  await check('denied permission never starts positioning', async () => {
    const env = fixture({ requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    assert.equal((await env.load('src/features/location/services/location-service.ts').getForegroundLocation()).status, 'denied');
    assert.equal(env.counts().watchers, 0);
  });
  await check('disabled services retain manual fallback', async () => {
    const env = fixture({ hasServicesEnabledAsync: async () => false });
    assert.equal((await env.load('src/features/location/services/location-service.ts').getForegroundLocation()).status, 'services-disabled');
    assert.equal(env.counts().watchers, 0);
  });
  await check('good fix handles callback-before-subscription race and removes watcher', async () => {
    let removed = 0;
    const env = fixture({ watchPositionAsync: async (_options, callback) => {
      callback({ coords: { latitude: 14.5, longitude: 121, accuracy: 10 }, timestamp: Date.now() });
      return { remove: () => { removed += 1; } };
    } });
    assert.equal((await env.load('src/features/location/services/location-service.ts').getForegroundLocation()).status, 'ready');
    assert.equal(removed, 1); assert.equal(env.timers.size, 0);
  });
  await check('timeout is bounded and cleans up positioning', async () => {
    const env = fixture();
    const pending = env.load('src/features/location/services/location-service.ts').getForegroundLocation();
    await new Promise((resolve) => setImmediate(resolve));
    [...env.timers][0]();
    assert.equal((await pending).status, 'timeout');
    assert.equal(env.counts().removed, 1);
  });
  await check('inaccurate fallback does not claim a reliable GPS fix', async () => {
    const env = fixture({ watchPositionAsync: async (_options, callback) => {
      callback({ coords: { latitude: 14.5, longitude: 121, accuracy: 500 }, timestamp: Date.now() });
      return { remove: () => undefined };
    } });
    const pending = env.load('src/features/location/services/location-service.ts').getForegroundLocation();
    await new Promise((resolve) => setImmediate(resolve));
    [...env.timers][0]();
    assert.equal((await pending).status, 'inaccurate');
  });
  await check('abort removes foreground watcher', async () => {
    const env = fixture(), controller = new AbortController();
    const pending = env.load('src/features/location/services/location-service.ts').getForegroundLocation(controller.signal);
    await new Promise((resolve) => setImmediate(resolve)); controller.abort();
    assert.equal((await pending).status, 'unavailable');
    assert.equal(env.counts().removed, 1); assert.equal(env.timers.size, 0);
  });
  await check('provider failure produces fallback and clears timeout', async () => {
    const env = fixture({ watchPositionAsync: async () => { throw new Error('TEST provider failure'); } });
    assert.equal((await env.load('src/features/location/services/location-service.ts').getForegroundLocation()).status, 'unavailable');
    assert.equal(env.timers.size, 0);
  });
  console.log(`\n${passed} location checks passed; permissions/provider responses mocked, no device GPS exercised.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
