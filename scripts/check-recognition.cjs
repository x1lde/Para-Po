#!/usr/bin/env node
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const jpeg = require('jpeg-js');
const root = path.resolve(__dirname, '..');
let passed = 0;
async function check(name, action) { await action(); passed += 1; console.log(`PASS ${name}`); }

/** Transpile-and-run loader for src/ TypeScript with '@/' aliases, JSON/asset imports and module mocks. */
function runtime(mocks = {}) {
  const cache = new Map();
  function resolve(specifier, from) {
    if (specifier.startsWith('@/assets/')) return path.join(root, 'assets', specifier.slice('@/assets/'.length));
    if (specifier.startsWith('@/')) return path.join(root, 'src', specifier.slice(2));
    return path.resolve(path.dirname(from), specifier);
  }
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) { const json = JSON.parse(readFileSync(filename, 'utf8')); cache.set(filename, json); return json; }
    if (filename.endsWith('.tflite')) { const asset = { __esModule: true, default: 42 }; cache.set(filename, asset); return asset; }
    const api = {};
    cache.set(filename, api);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier === 'jpeg-js') return jpeg;
      const target = resolve(specifier, filename);
      const relative = path.relative(root, target);
      if (mocks[relative] || mocks[`${relative}.ts`]) return mocks[relative] ?? mocks[`${relative}.ts`];
      for (const candidate of [target, `${target}.ts`, `${target}.native.ts`]) {
        if (/\.(json|tflite)$/.test(candidate) || (existsSync(candidate) && candidate.endsWith('.ts'))) return load(candidate);
      }
      throw new Error(`Cannot resolve ${specifier} from ${filename}`);
    };
    vm.runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename })(api, localRequire);
    return api;
  }
  return (relative) => load(path.join(root, relative));
}

const meta = JSON.parse(readFileSync(path.join(root, 'assets/models/landmark_model.json'), 'utf8'));
const LABELS = meta.labels;
const OTHER = 'other';

function scoresFor(entries) {
  const scores = new Float32Array(LABELS.length).fill(0.001);
  for (const [label, value] of Object.entries(entries)) scores[LABELS.indexOf(label)] = value;
  return scores;
}

/** Native mocks: image manipulator (records crops/releases), TFLite (scripted), repository (dataset-backed). */
function serviceFixture({ scores = scoresFor({ greenbelt: 0.97 }), failDelegates = [], imageSize = [4032, 3024],
  badShape = false, runError = null } = {}) {
  const log = { loads: [], crops: [], resizes: [], released: 0, runs: [] };
  const size = meta.input.shape[1];
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) rgba.set([200, 100, 50, 255], i * 4);
  const jpegBase64 = jpeg.encode({ data: rgba, width: size, height: size }, 100).data.toString('base64');
  const ref = (width, height, base64) => ({ width, height, release: () => { log.released += 1; },
    saveAsync: async (options) => { log.save = options; return { uri: 'file:///x.jpg', width, height, base64 }; } });
  let current = { width: imageSize[0], height: imageSize[1] };
  const context = {
    release: () => { log.released += 1; },
    crop(rect) { log.crops.push(rect); current = { width: rect.width, height: rect.height }; return context; },
    resize(next) { log.resizes.push(next); current = { width: next.width, height: next.height }; return context; },
    renderAsync: async () => ref(current.width, current.height, jpegBase64),
  };
  const landmarksByLabel = new Map();
  const loadTs = runtime({});
  for (const landmark of loadTs('src/database/seed.ts').bundledDataset.landmarks) {
    if (landmark.classificationLabel) landmarksByLabel.set(landmark.classificationLabel, landmark);
  }
  const mocks = {
    'react-native': { Platform: { OS: 'android' } },
    'expo-image-manipulator': { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } },
    'react-native-fast-tflite': {
      loadTensorflowModel: async (asset, delegates) => {
        log.loads.push(delegates);
        if (delegates.some((delegate) => failDelegates.includes(delegate))) throw new Error('delegate unavailable');
        return {
          inputs: [{ name: 'image', dataType: 'float32', shape: badShape ? [1, 160, 160, 3] : [1, size, size, 3] }],
          outputs: [{ name: 'probs', dataType: 'float32', shape: [1, LABELS.length] }],
          run: async ([input]) => {
            if (runError) throw runError;
            log.runs.push(new Float32Array(input));
            return [scores.buffer.slice(0)];
          },
        };
      },
    },
    'src/database/repositories/transport-repository.ts': {
      findLandmarkByClassificationLabel: async (label) => landmarksByLabel.get(label) ?? null,
    },
  };
  const load = runtime(mocks);
  return { service: load('src/features/recognition/services/recognition-service.native.ts'), log, size };
}

async function main() {
  const load = runtime({ 'expo-image-manipulator': {}, 'react-native': { Platform: { OS: 'android' } } });
  const scoring = load('src/features/recognition/services/scoring.ts');
  const preprocess = load('src/features/recognition/services/preprocess.ts');
  const model = load('src/features/recognition/model.ts');

  await check('bundled model metadata matches the recognition constants', async () => {
    assert.deepEqual([...model.MODEL_LABELS], LABELS);
    assert.equal(model.MODEL_INPUT_SIZE, 224);
    assert(model.CONFIDENCE_THRESHOLD > 0 && model.CONFIDENCE_THRESHOLD < 1);
    assert(LABELS.includes(model.NOT_A_LANDMARK_LABEL));
    assert.deepEqual(meta.input.shape, [1, 224, 224, 3]);
  });

  await check('every model label maps to exactly one landmark and back', async () => {
    const { bundledDataset } = load('src/database/seed.ts');
    const labels = bundledDataset.landmarks.map((landmark) => landmark.classificationLabel);
    assert.deepEqual(scoring.findLabelMismatches(LABELS, labels, OTHER), { missingLandmarks: [], unknownToModel: [] });
    assert.equal(new Set(labels).size, bundledDataset.landmarks.length);
    assert.deepEqual(scoring.findLabelMismatches(LABELS, [...labels.slice(1), 'retired'], OTHER),
      { missingLandmarks: [labels[0]].sort(), unknownToModel: ['retired'] });
  });

  await check('decision rules: recognized, uncertain, not-a-landmark', async () => {
    const t = model.CONFIDENCE_THRESHOLD;
    const recognized = scoring.interpretScores(scoresFor({ greenbelt: t, glorietta: 0.05, other: 0.04 }), LABELS, t, OTHER);
    assert.equal(recognized.kind, 'recognized');
    assert.equal(recognized.top.label, 'greenbelt');
    assert.deepEqual(recognized.candidates.map((c) => c.label), ['greenbelt', 'glorietta', 'avida_towers_makati_southpoint']);
    const uncertain = scoring.interpretScores(scoresFor({ sm_makati: t - 0.01, other: 0.3, one_ayala: 0.2 }), LABELS, t, OTHER);
    assert.equal(uncertain.kind, 'uncertain');
    assert.deepEqual(uncertain.candidates.map((c) => c.label), ['sm_makati', 'one_ayala', 'avida_towers_makati_southpoint']);
    const lowOther = scoring.interpretScores(scoresFor({ other: t - 0.01, rcbc_plaza: 0.1 }), LABELS, t, OTHER);
    assert.equal(lowOther.kind, 'uncertain');
    assert(lowOther.candidates.every((c) => c.label !== OTHER));
    const other = scoring.interpretScores(scoresFor({ other: 0.95, rcbc_plaza: 0.03 }), LABELS, t, OTHER);
    assert.equal(other.kind, 'not-a-landmark');
    assert.equal(other.candidates[0].label, 'rcbc_plaza');
    assert.throws(() => scoring.interpretScores(new Float32Array(3), LABELS, t, OTHER), /3 scores/);
    assert.throws(() => scoring.interpretScores(new Float32Array(LABELS.length).fill(NaN), LABELS, t, OTHER), /no finite/);
  });

  await check('center crop keeps the training framing (224 of 256 on the short side)', async () => {
    assert.deepEqual(preprocess.centerCropRect(4032, 3024), { originX: 693, originY: 189, width: 2646, height: 2646 });
    assert.deepEqual(preprocess.centerCropRect(256, 256), { originX: 16, originY: 16, width: 224, height: 224 });
    assert.deepEqual(preprocess.centerCropRect(1080, 1920), { originX: 67, originY: 487, width: 945, height: 945 });
    assert.throws(() => preprocess.centerCropRect(0, 10), /no size/);
  });

  await check('base64 and pixel packing produce float32 RGB 0-255 (no normalization)', async () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 128]);
    assert.deepEqual(Buffer.from(preprocess.base64ToBytes(bytes.toString('base64'))), bytes);
    assert.deepEqual(Buffer.from(preprocess.base64ToBytes(`data:image/jpeg;base64,${bytes.toString('base64')}`)), bytes);
    assert.throws(() => preprocess.base64ToBytes('ab$d'), /Invalid base64/);
    const tensor = preprocess.pixelsToTensor(new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]), 2, 1, 4);
    assert.deepEqual([...tensor], [10, 20, 30, 40, 50, 60]);
    assert.throws(() => preprocess.pixelsToTensor(new Uint8Array(5), 2, 1, 4), /smaller/);
  });

  await check('recognizes a landmark end to end (crop, resize, decode, run, map to landmark)', async () => {
    const { service, log, size } = serviceFixture({ scores: scoresFor({ the_landmark_makati: 0.93, glorietta: 0.04 }) });
    const result = await service.recognizeLandmark('file:///photo.jpg');
    assert.equal(result.status, 'recognized');
    assert.equal(result.landmark.id, 'landmark_makati');
    assert.equal(result.landmark.classificationLabel, 'the_landmark_makati');
    assert(Math.abs(result.confidence - 0.93) < 1e-6);
    assert.deepEqual(result.candidates.map((c) => c.landmark.id).slice(0, 2), ['landmark_makati', 'glorietta']);
    assert.deepEqual(log.crops, [{ originX: 693, originY: 189, width: 2646, height: 2646 }]);
    assert.deepEqual(log.resizes, [{ width: size, height: size }]);
    assert.deepEqual(log.save, { format: 'jpeg', compress: 1, base64: true });
    assert.equal(log.released, 3, 'context, original and resized refs are released');
    const input = log.runs[0];
    assert.equal(input.length, size * size * 3);
    assert(Math.abs(input[0] - 200) <= 3 && Math.abs(input[1] - 100) <= 3 && Math.abs(input[2] - 50) <= 3);
    assert(input.reduce((max, value) => Math.max(max, value), 0) > 1, 'input must stay in 0-255, not be normalized');
    assert.deepEqual(log.loads, [['android-gpu']]);
    await service.recognizeLandmark('file:///second.jpg');
    assert.equal(log.loads.length, 1, 'model is loaded once and reused');
  });

  await check('falls back to CPU when the GPU delegate fails; reports uncertain and not-a-landmark', async () => {
    const uncertain = serviceFixture({ failDelegates: ['android-gpu'], scores: scoresFor({ one_ayala: 0.5, sm_makati: 0.3 }) });
    const result = await uncertain.service.recognizeLandmark('file:///photo.jpg');
    assert.deepEqual(uncertain.log.loads, [['android-gpu'], []]);
    assert.equal(result.status, 'uncertain');
    assert.deepEqual(result.candidates.map((c) => c.landmark.id).slice(0, 2), ['one_ayala', 'sm_makati']);
    const other = serviceFixture({ scores: scoresFor({ other: 0.96, greenbelt: 0.02 }) });
    const notLandmark = await other.service.recognizeLandmark('file:///photo.jpg');
    assert.equal(notLandmark.status, 'not-a-landmark');
    assert.equal(notLandmark.candidates[0].landmark.id, 'greenbelt');
  });

  await check('load, shape and inference failures are reported, never thrown', async () => {
    const noModel = serviceFixture({ failDelegates: ['android-gpu', 'nnapi'], badShape: true });
    const failed = await noModel.service.recognizeLandmark('file:///photo.jpg');
    assert.equal(failed.status, 'unavailable');
    assert.equal(failed.reason, 'model-load-failed');
    assert.match(String(failed.error.message), /Unexpected model input/);
    await noModel.service.recognizeLandmark('file:///photo.jpg');
    assert.equal(noModel.log.loads.length, 4, 'a failed load (GPU then CPU) is retried on the next call');
    const broken = serviceFixture({ runError: new Error('boom') });
    assert.deepEqual(await broken.service.recognizeLandmark('file:///photo.jpg'),
      { status: 'unavailable', reason: 'inference-failed', error: new Error('boom') });
    const tiny = serviceFixture({ imageSize: [0, 0] });
    assert.equal((await tiny.service.recognizeLandmark('file:///photo.jpg')).reason, 'image-unreadable');
    assert.equal(tiny.log.released, 2, 'native image refs are released on failure');
  });

  await check('web build returns unsupported-platform without loading native modules', async () => {
    const web = runtime({})('src/features/recognition/services/recognition-service.ts');
    assert.deepEqual(await web.recognizeLandmark('file:///photo.jpg'), { status: 'unavailable', reason: 'unsupported-platform' });
    await assert.rejects(web.loadLandmarkModel(), /not available on web/);
  });

  console.log(`\n${passed} recognition checks passed (mocked TFLite/image manipulator; device inference not exercised).`);
}

main().catch((error) => { console.error(error); process.exit(1); });
