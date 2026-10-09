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

/** A valid softmax row: the given label probabilities, with the remaining mass spread over the rest. */
function scoresFor(entries) {
  const given = Object.values(entries).reduce((sum, value) => sum + value, 0);
  assert(given < 1, 'fixture probabilities must leave room for the other labels');
  const scores = new Float32Array(LABELS.length).fill((1 - given) / (LABELS.length - Object.keys(entries).length));
  for (const [label, value] of Object.entries(entries)) scores[LABELS.indexOf(label)] = value;
  return scores;
}

/** RGBA test photo: 8x8 blocks alternating two colours (JPEG-stable, plenty of detail), or a flat fill. */
function photoPixels(size, flat = null) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const colour = flat ?? (((x >> 3) + (y >> 3)) % 2 === 0 ? [200, 100, 50] : [30, 40, 90]);
    rgba.set([...colour, 255], (y * size + x) * 4);
  }
  return rgba;
}

/** Native mocks: image manipulator (records crops/releases), TFLite (scripted), repository (dataset-backed). */
const selfCheck = runtime({})('src/features/recognition/services/self-check.ts');
const SELF_CHECK_INPUT = selfCheck.selfCheckInput(meta.input.shape[1], meta.self_check.input);
const isSelfCheckInput = (input) => input.length === SELF_CHECK_INPUT.length && input.every((v, i) => v === SELF_CHECK_INPUT[i]);

/**
 * Native mocks: image manipulator (records crops/releases), TFLite (scripted), repository (dataset-backed).
 * The TFLite mock answers the self-check input with the metadata's reference output, unless the loaded
 * delegate set is listed in `brokenSelfCheck` ('cpu' for []), which simulates a delegate that computes wrongly.
 */
function serviceFixture({ scores = scoresFor({ greenbelt: 0.97 }), failDelegates = [], imageSize = [4032, 3024],
  badShape = false, runError = null, flatPhoto = null, lookupError = null, brokenSelfCheck = [] } = {}) {
  const log = { loads: [], crops: [], resizes: [], released: 0, runs: [], selfChecks: [], disposed: [] };
  const size = meta.input.shape[1];
  const rgba = photoPixels(size, flatPhoto);
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
        const name = delegates.length ? delegates.join('+') : 'cpu';
        return {
          delegates,
          inputs: [{ name: 'image', dataType: 'float32', shape: badShape ? [1, 160, 160, 3] : [1, size, size, 3] }],
          outputs: [{ name: 'probs', dataType: 'float32', shape: [1, LABELS.length] }],
          dispose: () => { log.disposed.push(name); },
          run: async ([input]) => {
            const pixels = new Float32Array(input);
            if (isSelfCheckInput(pixels)) {
              log.selfChecks.push(name);
              const reference = Float32Array.from(meta.self_check.probabilities);
              return [(brokenSelfCheck.includes(name) ? reference.reverse() : reference).buffer];
            }
            if (runError) throw runError;
            log.runs.push(pixels);
            return [scores.buffer.slice(0)];
          },
        };
      },
    },
    'src/database/repositories/transport-repository.ts': {
      findLandmarkByClassificationLabel: async (label) => {
        if (lookupError) throw lookupError;
        return landmarksByLabel.get(label) ?? null;
      },
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
    // Exactly at the threshold counts as recognized. Plain numbers: float32 can't hold most thresholds exactly
    // (Float32Array stores 0.83 as 0.82999998), and model outputs are compared as stored.
    const atThreshold = Array.from(scoresFor({ greenbelt: t, glorietta: (1 - t) / 2, other: (1 - t) / 4 }));
    atThreshold[LABELS.indexOf('greenbelt')] = t;
    const recognized = scoring.interpretScores(atThreshold, LABELS, t, OTHER);
    assert.equal(recognized.kind, 'recognized');
    assert.equal(recognized.top.label, 'greenbelt');
    assert.deepEqual(recognized.candidates.map((c) => c.label), ['greenbelt', 'glorietta', 'avida_towers_makati_southpoint']);
    const uncertain = scoring.interpretScores(scoresFor({ sm_makati: t - 0.01, other: (1 - t) / 2, one_ayala: (1 - t) / 4 }), LABELS, t, OTHER);
    assert.equal(uncertain.kind, 'uncertain');
    assert.deepEqual(uncertain.candidates.map((c) => c.label), ['sm_makati', 'one_ayala', 'avida_towers_makati_southpoint']);
    const lowOther = scoring.interpretScores(scoresFor({ other: t - 0.01, rcbc_plaza: (1 - t) / 2 }), LABELS, t, OTHER);
    assert.equal(lowOther.kind, 'uncertain');
    assert(lowOther.candidates.every((c) => c.label !== OTHER));
    const other = scoring.interpretScores(scoresFor({ other: 0.95, rcbc_plaza: 0.03 }), LABELS, t, OTHER);
    assert.equal(other.kind, 'not-a-landmark');
    assert.equal(other.candidates[0].label, 'rcbc_plaza');
  });

  await check('only a valid probability vector is interpreted (no NaN, range, length or sum errors)', async () => {
    const t = model.CONFIDENCE_THRESHOLD;
    const run = (scores) => () => scoring.interpretScores(scores, LABELS, t, OTHER);
    assert.throws(run(new Float32Array(3)), /3 scores/);
    assert.throws(run(new Float32Array(LABELS.length).fill(NaN)), /non-finite/);
    const oneNaN = scoresFor({ greenbelt: 0.97 }); oneNaN[0] = NaN;
    assert.throws(run(oneNaN), /non-finite/, 'a single NaN poisons the whole output');
    assert.throws(run(scoresFor({ greenbelt: 0.97 }).map((value) => value * 255)), /not a probability/, 'uint8-scaled output');
    assert.throws(run(new Float32Array(LABELS.length).fill(0)), /sum to 0/);
    assert.throws(run(new Float32Array(LABELS.length).fill(-1 / LABELS.length)), /not a probability/);
    const fp16Drift = scoresFor({ greenbelt: 0.97 }).map((value) => value * 1.003);
    assert.equal(scoring.interpretScores(fp16Drift, LABELS, t, OTHER).kind, 'recognized', 'small delegate drift is accepted');
  });

  await check('photo gate rejects blank, dark, blown-out and featureless frames but keeps real photos', async () => {
    const size = 224;
    const flat = (value) => new Float32Array(size * size * 3).fill(value);
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const noisy = (mean, spread) => new Float32Array(size * size * 3).map(() => Math.min(255, Math.max(0, mean + (random() - 0.5) * 2 * spread)));
    assert.equal(preprocess.assessPhoto(flat(0)), 'too-dark');
    assert.equal(preprocess.assessPhoto(noisy(3, 4)), 'too-dark', 'covered lens with sensor noise');
    assert.equal(preprocess.assessPhoto(flat(255)), 'too-bright');
    assert.equal(preprocess.assessPhoto(flat(128)), 'low-detail');
    assert.equal(preprocess.assessPhoto(noisy(128, 6)), 'low-detail', 'flat wall with noise');
    assert.equal(preprocess.assessPhoto(new Float32Array(0)), 'low-detail');
    const block = preprocess.pixelsToTensor(photoPixels(size), size, size, 4);
    assert.equal(preprocess.assessPhoto(block), null);
    // Grey image with `fraction` of pixels at `high` and the rest at `low`.
    const twoLevel = (low, high, fraction) => new Float32Array(size * size * 3).map((_, i) => (Math.floor(i / 3) % 1000) < fraction * 1000 ? high : low);
    // Darkest and flattest real training images: luminance mean 9.6 / spread 21.6, and mean 63 / spread 17.9.
    assert.equal(preprocess.assessPhoto(twoLevel(0, 58, 0.165)), null, 'dark night photo with a few lights is still recognized');
    assert.equal(preprocess.assessPhoto(twoLevel(45, 81, 0.5)), null, 'low-contrast real photo is still recognized');
  });

  await check('center crop keeps the training framing (224 of 256 on the short side)', async () => {
    assert.deepEqual(preprocess.centerCropRect(4032, 3024), { originX: 693, originY: 189, width: 2646, height: 2646 });
    assert.deepEqual(preprocess.centerCropRect(256, 256), { originX: 16, originY: 16, width: 224, height: 224 });
    assert.deepEqual(preprocess.centerCropRect(1080, 1920), { originX: 67, originY: 487, width: 945, height: 945 });
    assert.throws(() => preprocess.centerCropRect(0, 10), /no size/);
  });

  await check('resize goes through <2x steps so Android never aliases a phone photo', async () => {
    assert.deepEqual(preprocess.resizeSteps(2646, 224), [1792, 896, 448, 224], '12 MP photo crop');
    assert.deepEqual(preprocess.resizeSteps(945, 224), [896, 448, 224], '1080p frame crop');
    assert.deepEqual(preprocess.resizeSteps(448, 224), [448, 224]);
    assert.deepEqual(preprocess.resizeSteps(447, 224), [224]);
    assert.deepEqual(preprocess.resizeSteps(224, 224), [224]);
    assert.deepEqual(preprocess.resizeSteps(100, 224), [224], 'small images are upscaled once');
    for (const side of [225, 500, 1000, 3000, 6120, 9000]) {
      const steps = preprocess.resizeSteps(side, 224);
      assert.equal(steps.at(-1), 224);
      [side, ...steps].slice(1).forEach((next, i) => assert(([side, ...steps][i] / next) < 2 || ([side, ...steps][i] / next) === 2, `${side}: step ${i} shrinks by 2x at most`));
    }
    assert.throws(() => preprocess.resizeSteps(0, 224), /no size/);
  });

  await check('self-check input and comparison match the training-side definition', async () => {
    const input = selfCheck.selfCheckInput(4, { a: 5, b: 3, k: 7 });
    const expected = [];
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) for (let c = 0; c < 3; c += 1) expected.push(((x * 5 + y * 3) * (c + 1) + 7) % 256);
    assert.deepEqual([...input], expected, 'same formula as self_check_input in ml/train.py');
    const big = selfCheck.selfCheckInput(224, { a: 9, b: 8, k: 128 });
    assert(big.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));
    const check = { input: { a: 1, b: 2, k: 0 }, probabilities: [0.7, 0.2, 0.1], tolerance: 0.1 };
    assert.equal(selfCheck.selfCheckMismatch([0.75, 0.16, 0.09], check), null, 'within tolerance');
    assert.match(selfCheck.selfCheckMismatch([0.5, 0.4, 0.1], check), /off by 0.200/);
    assert.match(selfCheck.selfCheckMismatch([0.7, 0.2, NaN], check), /off by Infinity/);
    assert.match(selfCheck.selfCheckMismatch([0.7, 0.2], check), /2 outputs, expected 3/);
    assert.match(selfCheck.selfCheckMismatch([0.45, 0.46, 0.09], { ...check, tolerance: 0.3 }), /top class 1, expected 0/);
    assert.equal(meta.self_check.probabilities.length, LABELS.length, 'bundled metadata carries a reference output');
    assert(meta.self_check.tolerance > 0 && meta.self_check.tolerance <= 0.1);
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
    // 2646 px crop -> one <2x step to 1792, then exact halvings (Android's one-step bilinear would alias).
    assert.deepEqual(log.resizes, [1792, 896, 448, 224].map((side) => ({ width: side, height: side })));
    assert.deepEqual(log.save, { format: 'jpeg', compress: 1, base64: true });
    assert.equal(log.released, 3, 'context, original and resized refs are released');
    const input = log.runs[0];
    assert.equal(input.length, size * size * 3);
    assert(Math.abs(input[0] - 200) <= 3 && Math.abs(input[1] - 100) <= 3 && Math.abs(input[2] - 50) <= 3);
    const second = 8 * 3; // first pixel of the next 8x8 block
    assert(Math.abs(input[second] - 30) <= 3 && Math.abs(input[second + 1] - 40) <= 3 && Math.abs(input[second + 2] - 90) <= 3);
    assert(input.reduce((max, value) => Math.max(max, value), 0) > 1, 'input must stay in 0-255, not be normalized');
    assert.deepEqual(log.loads, [['android-gpu']]);
    assert.deepEqual(log.selfChecks, ['android-gpu'], 'the delegate is verified once, when the model loads');
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

  await check('a delegate that computes wrongly is dropped for CPU; a model failing on CPU is unavailable', async () => {
    const gpuBroken = serviceFixture({ brokenSelfCheck: ['android-gpu'], scores: scoresFor({ greenbelt: 0.97 }) });
    const result = await gpuBroken.service.recognizeLandmark('file:///photo.jpg');
    assert.equal(result.status, 'recognized', 'recognition still works on CPU');
    assert.deepEqual(gpuBroken.log.loads, [['android-gpu'], []]);
    assert.deepEqual(gpuBroken.log.selfChecks, ['android-gpu', 'cpu']);
    assert.deepEqual(gpuBroken.log.disposed, ['android-gpu'], 'the rejected GPU model is released');
    assert.equal(gpuBroken.log.runs.length, 1, 'the photo runs once, on the verified model');
    const allBroken = serviceFixture({ brokenSelfCheck: ['android-gpu', 'cpu'] });
    const failed = await allBroken.service.recognizeLandmark('file:///photo.jpg');
    assert.equal(failed.status, 'unavailable');
    assert.equal(failed.reason, 'model-load-failed');
    assert.match(String(failed.error.message), /self-check failed with delegates \[\]/);
    assert.equal(allBroken.log.runs.length, 0, 'an unverified model never classifies a photo');
  });

  await check('invalid model output is an inference failure, not a thrown error', async () => {
    const outputs = {
      nan: new Float32Array(LABELS.length).fill(NaN),
      'one NaN': Object.assign(scoresFor({ greenbelt: 0.97 }), { 3: NaN }),
      'wrong length': scoresFor({ greenbelt: 0.97 }).slice(0, 5),
      'not probabilities': scoresFor({ greenbelt: 0.97 }).map((value) => value * 255),
      empty: new Float32Array(0),
    };
    for (const [name, scores] of Object.entries(outputs)) {
      const result = await serviceFixture({ scores }).service.recognizeLandmark('file:///photo.jpg');
      assert.equal(result.status, 'unavailable', name);
      assert.equal(result.reason, 'inference-failed', name);
      assert(result.error instanceof Error, name);
    }
    const lookup = await serviceFixture({ lookupError: new Error('SQLITE_BUSY') }).service.recognizeLandmark('file:///photo.jpg');
    assert.deepEqual(lookup, { status: 'unavailable', reason: 'landmark-lookup-failed', error: new Error('SQLITE_BUSY') });
  });

  await check('blank and covered-lens photos are rejected before inference (the model never guesses on them)', async () => {
    for (const [flat, issue] of [[[0, 0, 0], 'too-dark'], [[255, 255, 255], 'too-bright'], [[128, 128, 128], 'low-detail'],
      [[2, 3, 2], 'too-dark']]) {
      // Even a model that would confidently call it a landmark (the old bundled model said 87% ayala_museum) is not consulted.
      const blank = serviceFixture({ flatPhoto: flat, scores: scoresFor({ ayala_museum: 0.95 }) });
      assert.deepEqual(await blank.service.recognizeLandmark('file:///black.jpg'), { status: 'unclear-photo', issue });
      assert.equal(blank.log.runs.length, 0, `${issue}: model is not run`);
      assert.equal(blank.log.released, 3, 'native image refs are still released');
    }
  });

  await check('web build returns unsupported-platform without loading native modules', async () => {
    const web = runtime({})('src/features/recognition/services/recognition-service.ts');
    assert.deepEqual(await web.recognizeLandmark('file:///photo.jpg'), { status: 'unavailable', reason: 'unsupported-platform' });
    await assert.rejects(web.loadLandmarkModel(), /not available on web/);
  });

  console.log(`\n${passed} recognition checks passed (mocked TFLite/image manipulator; device inference not exercised).`);
}

main().catch((error) => { console.error(error); process.exit(1); });
