#!/usr/bin/env node
// Exercise the real Ride screen with mocked hooks and backend failures, not native rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const places = [{ id: 'ayala_malls_circuit', name: 'Circuit' }, { id: 'one_ayala', name: 'One Ayala' }];
function fixture() {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let tree;
  let catalogFails = false;
  let recommend = async () => ({ result: { status: 'source-based' } });
  const requests = [], navigation = [];
  const mocks = {
    'react/jsx-runtime': jsx,
    react: {
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffect(callback, deps) { const i = cursor++; const previous = slots[i]; if (!previous || deps.some((value, j) => value !== previous.deps[j])) { previous?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = callback(); }); } },
    },
    'expo-image': { Image: 'Image' },
    'expo-router': { router: { navigate: (request) => navigation.push(request) } },
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: (styles) => styles, absoluteFill: {} } },
    '@/components/themed-text': { ThemedText: 'Text' },
    '@/components/commute/ui': { Art: 'Art', artwork: {}, Button: 'Button', Card: 'Card', Icon: 'Icon', Intro: 'Intro', Page: 'Page', ui: { row: {} } },
    '@/components/commute/illustrated-map': { IllustratedMap: 'IllustratedMap' },
    '@/database/data/pilot-dataset': { pilotDataset: { landmarks: places, destinations: places } },
    '@/features/maps/components/ChoicePicker': { ChoicePicker: 'ChoicePicker' },
    '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/hooks/use-responsive-layout': { useResponsiveLayout: () => ({ width: 400, tablet: false }) },
    '@/features/transport/components/commuter-data': {
      commuterDataAvailable: true,
      listLandmarks: async () => { if (catalogFails) throw Error('TEST ONLY storage failure'); return places; },
      listDestinations: async () => places,
      getJourneyRecommendations: async (request) => { requests.push(request); return recommend(request); },
    },
  };
  const code = ts.transpileModule(fs.readFileSync('src/app/index.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const api = {};
  vm.runInThisContext(`(function(exports, require) { ${code}\n})`)(api, (name) => { assert(name in mocks, name); return mocks[name]; });
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  function text(node) { if (typeof node === 'string') return node; if (Array.isArray(node)) return node.map(text).join(''); return node?.props ? text(node.props.children) : ''; }
  function render() { cursor = 0; tree = api.default(); effects.splice(0).forEach((effect) => effect()); }
  async function settle() { for (let i = 0; i < 4; i++) { render(); await tick(); } render(); }
  return {
    requests, navigation, settle,
    failCatalog(value) { catalogFails = value; },
    setRecommendation(value) { recommend = value; },
    button(label) { return nodes(tree).find((node) => node.type === 'Button' && text(node).includes(label)); },
    choose(label, id) { nodes(tree).find((node) => node.type === 'ChoicePicker' && node.props.label === label).props.onSelect(id); },
    text() { return text(tree); },
  };
}
async function main() {
  const ready = fixture(); await ready.settle();
  ready.choose('Starting point', places[0].id); ready.choose('Destination', places[1].id); await ready.settle();
  await ready.button('Find my ride').props.onPress(); await ready.settle();
  assert.deepEqual(ready.requests, [{ originId: places[0].id, destinationId: places[1].id }]);
  assert.equal(ready.navigation[0].params.destinationId, places[1].id);
  console.log('PASS Ride calls the shared API and preserves the selected pair');

  const broken = fixture(); broken.failCatalog(true); await broken.settle();
  assert.match(broken.text(), /Could not read the local trip data/);
  broken.failCatalog(false); broken.button('Retry local data').props.onPress(); await broken.settle();
  broken.choose('Starting point', places[0].id); broken.choose('Destination', places[1].id); await broken.settle();
  broken.setRecommendation(async () => { throw Error('TEST ONLY lookup failure'); });
  await broken.button('Find my ride').props.onPress(); await broken.settle();
  assert.equal(broken.navigation.length, 0);
  assert.match(broken.text(), /Could not read the local trip data/);
  console.log('PASS catalog/lookup failures retain retry and do not navigate to a false result');

  const stale = fixture(); await stale.settle();
  stale.choose('Starting point', places[0].id); stale.choose('Destination', places[1].id); await stale.settle();
  let resolve;
  stale.setRecommendation(() => new Promise((done) => { resolve = done; }));
  const pending = stale.button('Find my ride').props.onPress();
  stale.choose('Starting point', places[1].id); await stale.settle();
  resolve({ result: { status: 'already-at-destination' } }); await pending; await stale.settle();
  assert.equal(stale.navigation.length, 0);
  console.log('PASS stale Ride lookup cannot navigate after the selection changes');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
