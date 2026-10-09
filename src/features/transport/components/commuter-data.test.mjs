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

function loadNativeApp(openDatabaseAsync) {
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
  return load(path.join(root, 'src/features/transport/components/commuter-data.ts'));
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
