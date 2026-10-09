#!/usr/bin/env node
// Runs production TS modules against isolated real SQLite databases.
// The adapter exercises SQL/domain behavior, not Expo's native Android binding.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
let passed = 0;
async function check(name, action) {
  await action();
  passed += 1;
  console.log(`PASS ${name}`);
}

function sqliteAdapter(raw) {
  let closed = false;
  return {
    raw,
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, ...values) => raw.prepare(sql).run(...values),
    getFirstAsync: async (sql, ...values) => raw.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql, ...values) => raw.prepare(sql).all(...values),
    withTransactionAsync: async (action) => {
      raw.exec('BEGIN');
      try { await action(); raw.exec('COMMIT'); }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => { if (!closed) { raw.close(); closed = true; } },
    get closed() { return closed; },
  };
}

function appRuntime(openDatabaseAsync) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier === 'expo-sqlite') return { openDatabaseAsync };
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const resolved = specifier.startsWith('@/')
          ? path.join(root, 'src', specifier.slice(2))
          : path.resolve(path.dirname(filename), specifier);
        return load(`${resolved}.ts`);
      }
      return require(specifier);
    };
    const execute = vm.runInThisContext(`(function(exports, require, module) {\n${code}\n})`, { filename });
    execute(module.exports, localRequire, module);
    return module.exports;
  }
  return (relative) => load(path.join(root, relative));
}

async function main() {
  const databases = [];
  const makeDb = () => {
    const db = sqliteAdapter(new DatabaseSync(':memory:'));
    databases.push(db);
    return db;
  };
  let opens = 0;
  const db = makeDb();
  const load = appRuntime(async () => { opens += 1; return db; });
  const client = load('src/database/client.ts');
  const { bundledDataset, seedDatabase } = load('src/database/seed.ts');
  const { validateDataset } = load('src/database/validate-dataset.ts');
  const repo = load('src/database/repositories/transport-repository.ts');
  const { lookupTransportation } = load('src/features/transport/services/transport-service.ts');
  const schema = load('src/database/schema.ts');
  try {
    await check('fresh initialization, seed counts, foreign keys and shared connection', async () => {
      const connections = await Promise.all([client.getDatabase(), client.getDatabase(), client.getDatabase()]);
      assert(connections.every((connection) => connection === db));
      assert.equal(opens, 1);
      assert.equal(db.raw.prepare('PRAGMA user_version').get().user_version, 3);
      assert.equal(db.raw.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
      assert.equal((await repo.listLandmarks()).length, 14);
      assert.equal((await repo.listDestinations()).length, 14);
      assert.equal(db.raw.prepare('SELECT count(*) AS n FROM transportation_routes').get().n, 6);
      assert.equal((await repo.getDatasetMetadata()).version, bundledDataset.version);
      assert.deepEqual(db.raw.prepare('PRAGMA foreign_key_check').all(), []);
    });
    await check('all six sourced combinations and strict-mode behavior', async () => {
      for (const destination of ['one_ayala', 'sm_makati', 'glorietta', 'landmark_makati', 'greenbelt']) {
        const result = await lookupTransportation('ayala_malls_circuit', destination);
        assert.equal(result.status, 'source-based');
        assert(result.options.every((option) => option.route.destinationId === destination));
        assert(result.options.every((option) => option.boardingPoint.latitude === null && !option.accessVerified));
        assert.equal((await lookupTransportation('ayala_malls_circuit', destination, false)).status, 'incomplete-guidance');
      }
      assert.equal((await lookupTransportation('one_ayala', 'ayala_malls_circuit')).status, 'source-based');
      assert.equal((await repo.listDestinationsForOrigin('ayala_malls_circuit')).length, 5);
      assert.deepEqual(await repo.listDestinationsForOrigin('ayala_malls_circuit', false), []);
      assert.equal((await repo.listDestinationsForOrigin('one_ayala')).length, 1);
    });
    await check('uncovered, same-place, invalid and SQL-like IDs', async () => {
      assert.equal((await lookupTransportation('rcbc_plaza', 'powerplant_mall')).status, 'no-routes');
      assert.equal((await lookupTransportation('one_ayala', 'one_ayala')).status, 'already-at-destination');
      assert.equal((await lookupTransportation('missing', 'one_ayala')).status, 'unsupported-origin');
      assert.equal((await lookupTransportation('one_ayala', 'missing')).status, 'unsupported-destination');
      assert.equal((await lookupTransportation("one_ayala' OR 1=1 --", 'one_ayala')).status, 'unsupported-origin');
    });
    await check('same-version seed does not replace installed data', async () => {
      db.raw.exec("UPDATE landmarks SET name = 'TEST ONLY retained sentinel' WHERE id = 'one_ayala'");
      await db.withTransactionAsync(() => seedDatabase(db, bundledDataset));
      assert.equal((await repo.findLandmark('one_ayala')).name, 'TEST ONLY retained sentinel');
    });
    await check('invalid dataset validation rejects before replacement', async () => {
      const invalid = structuredClone(bundledDataset);
      invalid.version = bundledDataset.version + 1;
      invalid.landmarks[0].latitude = 14;
      assert.throws(() => validateDataset(invalid), /coordinates/);
      await assert.rejects(db.withTransactionAsync(() => seedDatabase(db, invalid)), /coordinates/);
      const duplicate = structuredClone(bundledDataset);
      duplicate.landmarks.push(duplicate.landmarks[0]);
      assert.throws(() => validateDataset(duplicate), /duplicate/);
      const orphan = structuredClone(bundledDataset);
      orphan.routes[0].destinationId = 'missing';
      assert.throws(() => validateDataset(orphan), /Unknown destination/);
      const order = structuredClone(bundledDataset);
      order.routeBoardingPoints.push(order.routeBoardingPoints[0]);
      assert.throws(() => validateDataset(order), /duplicate/);
      assert.equal((await repo.getDatasetMetadata()).version, bundledDataset.version);
      assert.equal((await repo.listLandmarks()).length, 14);
    });
    await check('mid-seed SQL failure rolls back deleted rows and metadata', async () => {
      const changed = structuredClone(bundledDataset);
      changed.version = bundledDataset.version + 1;
      db.raw.exec("CREATE TRIGGER test_seed_failure BEFORE INSERT ON destinations BEGIN SELECT RAISE(ABORT, 'TEST ONLY forced failure'); END;");
      await assert.rejects(db.withTransactionAsync(() => seedDatabase(db, changed)), /forced failure/);
      db.raw.exec('DROP TRIGGER test_seed_failure');
      assert.equal((await repo.getDatasetMetadata()).version, bundledDataset.version);
      assert.equal((await repo.findLandmark('one_ayala')).name, 'TEST ONLY retained sentinel');
      assert.equal(db.raw.prepare('SELECT count(*) AS n FROM transportation_routes').get().n, 6);
    });
    await check('complete manual option with null coordinates beats sourced alternatives', async () => {
      db.raw.exec(`
        INSERT INTO transportation_routes SELECT 'test-alternative', name, transportation_type, destination_id,
          alighting_location, alighting_instructions, destination_walking_instructions,
          evidence_status, source_reference, reviewed_on, limitations
        FROM transportation_routes WHERE id = 'circuit-p2p-to-one-ayala';
        INSERT INTO route_boarding_points VALUES ('test-alternative', 'circuit-cityflats-p2p-loading', 0, 'TEST ONLY boarding', 0);
        UPDATE route_boarding_points SET boarding_verified = 1 WHERE route_id = 'circuit-p2p-to-one-ayala';
        UPDATE landmark_boarding_points SET access_verified = 1, walking_instructions = 'TEST ONLY reviewed access' WHERE landmark_id = 'ayala_malls_circuit';
        UPDATE transportation_routes SET destination_walking_instructions = 'TEST ONLY arrival access' WHERE id = 'circuit-p2p-to-one-ayala';
      `);
      const result = await lookupTransportation('ayala_malls_circuit', 'one_ayala', false);
      assert.equal(result.status, 'available');
      assert.deepEqual(result.options.map((option) => option.route.id), ['circuit-p2p-to-one-ayala']);
      assert.deepEqual(result.options[0].guidanceIssues, ['boarding-coordinates-unavailable']);
      assert.equal((await lookupTransportation('ayala_malls_circuit', 'sm_makati')).status, 'source-based');
      assert.equal((await repo.listDestinationsForOrigin('ayala_malls_circuit', false)).length, 1);
    });
    await check('higher dataset version removes obsolete reference routes; downgrade rejected', async () => {
      const changed = structuredClone(bundledDataset);
      changed.version = bundledDataset.version + 1;
      changed.routes = changed.routes.slice(0, 1);
      changed.routeBoardingPoints = changed.routeBoardingPoints.filter((link) => link.routeId === changed.routes[0].id);
      await db.withTransactionAsync(() => seedDatabase(db, changed));
      assert.equal(db.raw.prepare('SELECT count(*) AS n FROM transportation_routes').get().n, 1);
      assert.equal((await lookupTransportation('one_ayala', 'ayala_malls_circuit')).status, 'no-routes');
      await assert.rejects(db.withTransactionAsync(() => seedDatabase(db, bundledDataset)), /newer/);
    });
    for (const version of [1, 2]) {
      await check(`schema ${version} to 3 preserves populated reference relationships`, async () => {
        const legacy = makeDb();
        legacy.raw.exec(schema.INITIAL_SCHEMA);
        legacy.raw.exec(`
          INSERT INTO landmarks VALUES ('test-origin', 'TEST ONLY origin', 14, 121, 'test-label');
          INSERT INTO destinations VALUES ('test-destination', 'TEST ONLY destination', 14, 121);
          INSERT INTO boarding_points VALUES ('test-point', 'TEST ONLY boarding', 14, 121);
          INSERT INTO transportation_routes VALUES ('test-route', 'TEST ONLY route', 'jeepney', 'test-destination');
          INSERT INTO route_boarding_points VALUES ('test-route', 'test-point', 0);
          INSERT INTO landmark_boarding_points VALUES ('test-origin', 'test-point');
          INSERT INTO dataset_metadata VALUES (1, ${bundledDataset.version}, 'TEST ONLY existing version');
        `);
        if (version === 2) {
          legacy.raw.exec(schema.COMMUTER_INSTRUCTIONS_MIGRATION);
          legacy.raw.exec("UPDATE transportation_routes SET alighting_instructions = 'TEST ONLY preserved instructions'");
        }
        legacy.raw.exec(`PRAGMA user_version = ${version}; PRAGMA foreign_keys = ON;`);
        const legacyLoad = appRuntime(async () => legacy);
        await legacyLoad('src/database/client.ts').getDatabase();
        assert.equal(legacy.raw.prepare('PRAGMA user_version').get().user_version, 3);
        assert.equal(legacy.raw.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
        assert.equal(legacy.raw.prepare('SELECT classification_label FROM landmarks').get().classification_label, 'test-label');
        assert.equal(legacy.raw.prepare('SELECT count(*) AS n FROM route_boarding_points').get().n, 1);
        assert.equal(legacy.raw.prepare('SELECT count(*) AS n FROM landmark_boarding_points').get().n, 1);
        assert.deepEqual(legacy.raw.prepare('PRAGMA foreign_key_check').all(), []);
        const migrated = legacy.raw.prepare('SELECT * FROM transportation_routes').get();
        assert.equal(migrated.evidence_status, 'pending');
        assert.equal(migrated.alighting_instructions, version === 2 ? 'TEST ONLY preserved instructions' : null);
      });
    }
    await check('dataset 2 upgrade removes retired wine place from both catalogs', async () => {
      const installed = makeDb();
      installed.raw.exec('PRAGMA foreign_keys = OFF;');
      installed.raw.exec(schema.INITIAL_SCHEMA + schema.COMMUTER_INSTRUCTIONS_MIGRATION + schema.MANUAL_CATALOG_MIGRATION);
      installed.raw.exec('PRAGMA foreign_keys = ON; PRAGMA user_version = 3;');
      const oldDataset = structuredClone(bundledDataset);
      oldDataset.version = 2;
      const retiredPlace = { id: 'manila-premiere-wines', name: 'TEST ONLY retired place', latitude: null, longitude: null };
      oldDataset.landmarks.push({ ...retiredPlace, classificationLabel: null });
      oldDataset.destinations.push(retiredPlace);
      await installed.withTransactionAsync(() => seedDatabase(installed, oldDataset));
      const upgradedLoad = appRuntime(async () => installed);
      const upgradedRepo = upgradedLoad('src/database/repositories/transport-repository.ts');
      const upgradedService = upgradedLoad('src/features/transport/services/transport-service.ts');
      assert.equal((await upgradedRepo.listLandmarks()).length, 14);
      assert.equal((await upgradedRepo.listDestinations()).length, 14);
      assert.equal(await upgradedRepo.findLandmark(retiredPlace.id), null);
      assert.equal(await upgradedRepo.findDestination(retiredPlace.id), null);
      assert.equal((await upgradedService.lookupTransportation(retiredPlace.id, 'one_ayala')).status, 'unsupported-origin');
      assert.equal((await upgradedService.lookupTransportation('one_ayala', retiredPlace.id)).status, 'unsupported-destination');
      assert.equal((await upgradedService.lookupTransportation('ayala_malls_circuit', 'one_ayala')).status, 'source-based');
      assert.equal(installed.raw.prepare('SELECT count(*) AS n FROM transportation_routes').get().n, 6);
      assert.deepEqual(installed.raw.prepare('PRAGMA foreign_key_check').all(), []);
    });
    await check('dataset 3 upgrade replaces dashed place IDs and preserves all six journeys', async () => {
      const installed = makeDb();
      installed.raw.exec(schema.INITIAL_SCHEMA + schema.COMMUTER_INSTRUCTIONS_MIGRATION + schema.MANUAL_CATALOG_MIGRATION);
      installed.raw.exec('PRAGMA foreign_keys = ON; PRAGMA user_version = 3;');
      const oldDataset = structuredClone(bundledDataset);
      oldDataset.version = 3;
      const oldId = (id) => id.replaceAll('_', '-');
      oldDataset.landmarks.forEach((place) => { place.id = oldId(place.id); });
      oldDataset.destinations.forEach((place) => { place.id = oldId(place.id); });
      oldDataset.routes.forEach((route) => { route.destinationId = oldId(route.destinationId); });
      oldDataset.landmarkBoardingPoints.forEach((link) => { link.landmarkId = oldId(link.landmarkId); });
      await installed.withTransactionAsync(() => seedDatabase(installed, oldDataset));
      assert.equal(installed.raw.prepare("SELECT count(*) AS n FROM landmarks WHERE id = 'one-ayala'").get().n, 1);
      const upgradedLoad = appRuntime(async () => installed);
      const upgradedRepo = upgradedLoad('src/database/repositories/transport-repository.ts');
      const upgradedService = upgradedLoad('src/features/transport/services/transport-service.ts');
      const landmarks = await upgradedRepo.listLandmarks();
      const destinations = await upgradedRepo.listDestinations();
      assert.equal(landmarks.length, 14);
      assert.equal(destinations.length, 14);
      assert(landmarks.every((place) => !place.id.includes('-')));
      assert(destinations.every((place) => !place.id.includes('-')));
      for (const oldPlace of oldDataset.landmarks.filter((place) => place.id.includes('-'))) {
        assert.equal(await upgradedRepo.findLandmark(oldPlace.id), null);
        assert.equal(await upgradedRepo.findDestination(oldPlace.id), null);
        assert(await upgradedRepo.findLandmark(oldPlace.id.replaceAll('-', '_')));
      }
      for (const destination of ['one_ayala', 'sm_makati', 'glorietta', 'landmark_makati', 'greenbelt']) {
        assert.equal((await upgradedService.lookupTransportation('ayala_malls_circuit', destination)).status, 'source-based');
      }
      assert.equal((await upgradedService.lookupTransportation('one_ayala', 'ayala_malls_circuit')).status, 'source-based');
      assert.equal((await upgradedRepo.getDatasetMetadata()).version, 4);
      assert.deepEqual(installed.raw.prepare('SELECT id FROM transportation_routes ORDER BY id').all().map((row) => row.id),
        oldDataset.routes.map((route) => route.id).sort());
      assert.deepEqual(installed.raw.prepare('PRAGMA foreign_key_check').all(), []);
      await installed.withTransactionAsync(() => seedDatabase(installed, bundledDataset));
      assert.equal((await upgradedRepo.getDatasetMetadata()).version, 4);
    });
    await check('failed initialization closes connection and retries; newer schema rejected', async () => {
      const future = makeDb();
      future.raw.exec('PRAGMA user_version = 99');
      const replacement = makeDb();
      let attempts = 0;
      const retryLoad = appRuntime(async () => ++attempts === 1 ? future : replacement);
      const retryClient = retryLoad('src/database/client.ts');
      await assert.rejects(retryClient.getDatabase(), /newer/);
      assert(future.closed);
      assert.equal(await retryClient.getDatabase(), replacement);
      assert.equal(attempts, 2);
    });
    console.log(`\n${passed} offline-data checks passed (Node SQLite adapter; Android not exercised).`);
  } finally {
    for (const database of databases) await database.closeAsync();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
