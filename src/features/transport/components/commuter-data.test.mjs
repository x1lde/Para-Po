import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

function createSqliteAdapter(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, ...values) => raw.prepare(sql).run(...values),
    getFirstAsync: async (sql, ...values) => raw.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql, ...values) => raw.prepare(sql).all(...values),
    withTransactionAsync: async (action) => {
      raw.exec('BEGIN');
      try { await action(); raw.exec('COMMIT'); }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => raw.close(),
  };
}

function loadNativeApp(openDatabaseAsync, entry = 'src/features/transport/components/commuter-data.ts') {
  const root = path.resolve();
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const source = readFileSync(filename, 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier === 'expo-sqlite') return { openDatabaseAsync };
      if (specifier.startsWith('@/')) return load(path.join(root, 'src', specifier.slice(2) + '.ts'));
      if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier + '.ts'));
      return require(specifier);
    };
    vm.runInThisContext(`(function(exports, require, module) { ${code}\n})`, { filename })(loaded.exports, localRequire, loaded);
    return loaded.exports;
  }
  return load(path.join(root, entry));
}

test('native commuter data exposes every SQLite destination, including unsupported pairs', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = createSqliteAdapter(raw);
  try {
    const commuterData = loadNativeApp(async () => db);
    const destinations = await commuterData.listDestinations();
    assert.equal(destinations.length, 14);
    assert(destinations.some((destination) => destination.id === 'powerplant_mall'));
    assert.equal((await commuterData.lookupTransportation('rcbc_plaza', 'powerplant_mall')).status, 'no-routes');
  } finally {
    await db.closeAsync();
  }
});


test('map handoff keeps the chosen pair and validates the selected ride against SQLite', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = createSqliteAdapter(raw);
  try {
    const { loadMapJourney } = loadNativeApp(async () => db, 'src/features/maps/components/journey-loader.ts');
    const empty = await loadMapJourney(null);
    assert.equal(empty.result, null);
    assert.equal(empty.destinations.length, 14);
    const chosen = await loadMapJourney({ originId: 'ayala_malls_circuit', destinationId: 'sm_makati',
      routeId: 'circuit-p2p-via-one-ayala-to-sm-makati', boardingPointId: 'circuit-cityflats-p2p-loading' });
    assert.equal(chosen.result.destination.id, 'sm_makati');
    assert.equal(chosen.selectedOption.route.id, 'circuit-p2p-via-one-ayala-to-sm-makati');
    const unsupported = await loadMapJourney({ originId: 'rcbc_plaza', destinationId: 'powerplant_mall' });
    assert.equal(unsupported.result.status, 'no-routes');
    assert.equal(unsupported.destinationId, 'powerplant_mall');
    assert.equal(unsupported.destinations.length, 13);
    const stale = await loadMapJourney({ originId: 'ayala_malls_circuit', destinationId: 'one_ayala',
      routeId: 'circuit-p2p-via-one-ayala-to-sm-makati', boardingPointId: 'circuit-cityflats-p2p-loading' });
    assert.equal(stale.selectedOption, undefined);
    assert.equal(stale.selectionUnavailable, true);
  } finally { await db.closeAsync(); }
});
