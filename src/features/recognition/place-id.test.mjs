import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pilotDataset } from '../../database/data/pilot-dataset.ts';
import { placeIdForLabel } from './place-id.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const metadata = JSON.parse(await readFile(path.join(root, 'assets/models/landmark_model.json'), 'utf8'));

test('every supported camera label maps to a place in the SQLite catalog', () => {
  const catalogIds = new Set(pilotDataset.landmarks.map((place) => place.id));
  const supportedLabels = metadata.labels.filter((label) => label !== 'other');
  const mappedIds = supportedLabels.map((label) => placeIdForLabel(label));
  assert.equal(supportedLabels.length, 14);
  assert(mappedIds.every((id) => id && catalogIds.has(id)));
  assert.equal(new Set(mappedIds).size, supportedLabels.length);
});

test('the not-a-landmark class stays unmapped and unknown labels fail explicitly', () => {
  assert.equal(placeIdForLabel('other'), null);
  assert.throws(() => placeIdForLabel('unrecognized_output'), RangeError);
});
