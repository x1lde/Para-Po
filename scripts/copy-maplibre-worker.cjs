// Copies MapLibre GL's web worker into public/ so the web map can load it from the site root.
// Runs on postinstall, so the copy always matches the installed maplibre-gl version.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs');
if (!fs.existsSync(source)) {
  console.log('maplibre-gl is not installed; skipping web worker copy.');
  process.exit(0);
}
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.copyFileSync(source, path.join(root, 'public/maplibre-gl-worker.mjs'));
console.log('Copied maplibre-gl-worker.mjs to public/.');
