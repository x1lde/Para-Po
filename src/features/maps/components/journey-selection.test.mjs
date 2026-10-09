import assert from 'node:assert/strict';
import test from 'node:test';

import { selectJourneyDestination, selectJourneyOrigin } from './journey-selection.ts';

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
