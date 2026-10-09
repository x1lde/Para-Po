import assert from 'node:assert/strict';
import test from 'node:test';

import { excludeCurrentOrigin, filterOptionsByMode } from './commuter-selection.ts';

test('destination choices exclude the selected origin', () => {
  const destinations = [{ id: 'one-ayala' }, { id: 'circuit' }];
  assert.deepEqual(excludeCurrentOrigin(destinations, 'one-ayala'), [{ id: 'circuit' }]);
});

test('mode filters match exact stored transport types', () => {
  const options = [
    { route: { transportationType: 'bus' } },
    { route: { transportationType: 'e-bus' } },
  ];
  assert.deepEqual(filterOptionsByMode(options, 'bus'), [options[0]]);
  assert.deepEqual(filterOptionsByMode(options, 'e-jeep'), []);
});
