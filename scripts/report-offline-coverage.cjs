#!/usr/bin/env node
// Inspect bundled reference data without starting Expo or opening native SQLite.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const api = {};
  cache.set(filename, api);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireLocal = (specifier) => load(`${specifier.startsWith('@/')
    ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier)}.ts`);
  vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename })(api, requireLocal);
  return api;
}
const { bundledDataset } = load(path.join(root, 'src/database/seed.ts'));
const { getDatasetCoverage } = load(path.join(root, 'src/database/dataset-coverage.ts'));
process.stdout.write(JSON.stringify(getDatasetCoverage(bundledDataset), null, 2) + '\n');
