#!/usr/bin/env node
// Exercise the actual screen's handlers and rendered choices with mocked hooks/native modules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const landmark = { id: 'greenbelt', name: 'Greenbelt' };
const other = { id: 'glorietta', name: 'Glorietta' };

function fixture({ result, state = { status: 'ready' }, platform = 'android', permission = { granted: true }, photo, recognizeError } = {}) {
  const slots = [];
  let cursor = 0;
  let mounted = false;
  let focusCleanup;
  let appStateChange;
  let tree;
  const log = { photos: 0, uris: [], navigation: [] };
  const effects = [];
  const mocks = {
    'react/jsx-runtime': jsx,
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useCallback: (callback) => callback,
      useEffect: (callback) => { if (!mounted) effects.push(callback); },
    },
    'expo-camera': {
      CameraView: 'CameraView',
      useCameraPermissions: () => [permission, async () => {}, async () => {}],
    },
    'expo-router': {
      router: { navigate: (request) => log.navigation.push(request) },
      useFocusEffect: (callback) => { if (!mounted) effects.push(() => { focusCleanup = callback(); }); },
    },
    'react-native': {
      Platform: { OS: platform }, StyleSheet: { create: (value) => value }, Linking: { openSettings: async () => {} },
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
      AppState: { currentState: 'active', addEventListener: (_, callback) => { appStateChange = callback; return { remove() {} }; } },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/hooks/use-theme': { useTheme: () => ({ primary: '#5b51ce', primaryText: '#fff' }) },
    '@/components/commute/ui': { Icon: 'Icon' },
    '@/components/themed-text': { ThemedText: 'Text' },
    '@/components/themed-view': { ThemedView: 'View' },
    '@/database/data/pilot-dataset': { pilotDataset: { landmarks: [landmark, other] } },
    '@/features/maps/components/ChoicePicker': { ChoicePicker: 'ChoicePicker' },
    '../hooks/use-landmark-recognition': { useLandmarkRecognition: () => ({ state, recognize: async (uri) => { log.uris.push(uri); if (recognizeError) throw recognizeError; return result; } }) },
  };
  const compiled = ts.transpileModule(fs.readFileSync('src/features/recognition/components/LandmarkCamera.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${compiled}\n})`)(exports, (name) => {
    assert(name in mocks, `Unexpected native import: ${name}`);
    return mocks[name];
  });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child));
    return [node, ...nodes(node.props?.children)];
  }
  function render() {
    cursor = 0;
    tree = exports.LandmarkCamera();
    for (const node of nodes(tree)) if (node.type === 'CameraView') node.props.ref.current = {
      takePictureAsync: async () => { log.photos++; return photo ? photo() : { uri: 'file:///landmark.jpg' }; },
    };
    if (!mounted) { mounted = true; effects.forEach((effect) => effect()); return render(); }
    return tree;
  }
  const text = (node) => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(text).join('');
    return node?.props ? text(node.props.children) : '';
  };
  render();
  const api = {
    log, render, nodes: () => nodes(tree), text: () => text(tree), blur: () => focusCleanup(), background: () => appStateChange('background'),
    button: (label) => nodes(tree).find((node) => node.type === 'Pressable' && text(node).includes(label)),
    async capture() {
      nodes(tree).find((node) => node.type === 'CameraView').props.onCameraReady();
      render();
      api.button('Take landmark photo').props.onPress();
      await flush(); render();
    },
  };
  return api;
}

async function main() {
  const recognized = fixture({ result: { status: 'recognized', landmark, candidates: [{ landmark }] } });
  await recognized.capture();
  assert.deepEqual(recognized.log.uris, ['file:///landmark.jpg']);
  assert(recognized.text().includes('Starting from Greenbelt'));
  recognized.button('Plan journey').props.onPress();
  assert.equal(recognized.log.navigation[0].pathname, '/map');
  assert.equal(recognized.log.navigation[0].params.originId, landmark.id);
  assert(recognized.log.navigation[0].params.originRequest);
  console.log('PASS photo URI is recognized and recognized origin is passed to the map');

  const uncertain = fixture({ result: { status: 'uncertain', candidates: [{ landmark: other }, { landmark }] } });
  await uncertain.capture();
  assert(uncertain.text().includes('Which landmark are you closest to?'));
  assert.equal(uncertain.button('Plan journey'), undefined);
  uncertain.button('Glorietta').props.onPress(); uncertain.render();
  assert(uncertain.text().includes('Starting from Glorietta'));
  console.log('PASS uncertain results require candidate selection before using an origin');

  for (const result of [{ status: 'not-a-landmark' }, { status: 'unavailable', reason: 'image-unreadable' }]) {
    const app = fixture({ result }); await app.capture();
    assert.equal(app.button('Plan journey'), undefined);
    const picker = app.nodes().find((node) => node.type === 'ChoicePicker');
    assert.equal(picker.props.choices.length, 2);
    picker.props.onSelect(other.id); app.render();
    assert(app.text().includes('Starting from Glorietta'));
  }
  console.log('PASS rejected/unavailable recognition offers the full manual list');

  for (const [issue, phrase] of [['too-dark', 'too dark'], ['too-bright', 'too bright'], ['low-detail', 'too little detail']]) {
    const app = fixture({ result: { status: 'unclear-photo', issue } }); await app.capture();
    assert(app.text().includes(phrase), issue);
    assert(!app.text().includes('Could not take the photo'), issue);
    assert.equal(app.button('Plan journey'), undefined);
    assert(app.button('Take landmark photo'), 'the user can retake');
  }
  console.log('PASS blank or unclear photos ask for a retake without picking an origin');

  const failingRecognize = fixture({ recognizeError: new Error('recognizer crashed') });
  await failingRecognize.capture();
  assert(failingRecognize.text().includes('Could not recognize this photo'));
  assert(!failingRecognize.text().includes('Could not take the photo'));
  const failingCamera = fixture({ photo: () => { throw new Error('camera busy'); } });
  await failingCamera.capture();
  assert(failingCamera.text().includes('Could not take the photo'));
  console.log('PASS recognition errors are not reported as photo-capture failures');

  for (const options of [{ platform: 'web' }, { state: { status: 'unavailable' } }, { permission: { granted: false, canAskAgain: false } }]) {
    const app = fixture(options);
    assert(!app.nodes().some((node) => node.type === 'CameraView'));
    assert(app.nodes().some((node) => node.type === 'ChoicePicker'));
    if (options.permission) assert(app.button('Open device settings'));
  }
  console.log('PASS web, unavailable model and denied permission preserve manual selection');

  let resolvePhoto;
  const pending = fixture({ photo: () => new Promise((resolve) => { resolvePhoto = resolve; }), result: { status: 'recognized', landmark, candidates: [] } });
  pending.nodes().find((node) => node.type === 'CameraView').props.onCameraReady(); pending.render();
  const shutter = pending.button('Take landmark photo');
  shutter.props.onPress(); shutter.props.onPress();
  assert.equal(pending.log.photos, 1);
  pending.blur(); pending.render();
  assert(!pending.nodes().some((node) => node.type === 'CameraView'));
  resolvePhoto({ uri: 'file:///stale.jpg' }); await flush(); pending.render();
  assert.deepEqual(pending.log.uris, []);
  assert.equal(pending.button('Plan journey'), undefined);
  console.log('PASS duplicate capture is blocked and blur discards pending captures');
  const backgrounded = fixture(); backgrounded.background(); backgrounded.render();
  assert(!backgrounded.nodes().some((node) => node.type === 'CameraView'));
  console.log('PASS camera is unmounted in the background');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
