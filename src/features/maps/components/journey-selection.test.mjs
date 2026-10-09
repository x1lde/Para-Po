import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseBoardingOption, selectJourneyDestination, selectJourneyOrigin } from './journey-selection.ts';

test('changing origin preserves a different destination and drops stale route details', () => {
  assert.deepEqual(selectJourneyOrigin({
    originId: 'old_origin', destinationId: 'destination', routeId: 'old_route', boardingPointId: 'old_stop',
  }, 'new_origin'), { originId: 'new_origin', destinationId: 'destination' });
});

test('changing origin clears a destination that would become the same place', () => {
  assert.deepEqual(selectJourneyOrigin({ originId: 'old_origin', destinationId: 'same' }, 'same'), {
    originId: 'same', destinationId: '',
  });
});

test('changing destination keeps the current origin and drops stale route details', () => {
  assert.deepEqual(selectJourneyDestination({
    originId: 'origin', destinationId: 'old_destination', routeId: 'old_route', boardingPointId: 'old_stop',
  }, 'new_destination'), { originId: 'origin', destinationId: 'new_destination' });
});

test('a shared boarding point retains the selected eligible route', () => {
  const first = { route: { id: 'first' }, boardingPoint: { id: 'shared' } };
  const selected = { route: { id: 'chosen' }, boardingPoint: { id: 'shared' } };
  const other = { route: { id: 'elsewhere' }, boardingPoint: { id: 'other' } };
  assert.equal(chooseBoardingOption([first, selected, other], 'shared', 'chosen'), selected);
  assert.equal(chooseBoardingOption([first, selected, other], 'other', 'chosen'), other);
  assert.equal(chooseBoardingOption([first, selected], 'shared', 'removed'), first);
  assert.equal(chooseBoardingOption([first, selected], 'missing', 'chosen'), undefined);
});
