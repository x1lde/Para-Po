import assert from 'node:assert/strict';
import test from 'node:test';

import { filterOptionsByMode, getDestinationChoices } from './commuter-selection.ts';

test('destination choices are available before origin selection', () => {
  const destinations = [
    { id: 'one-ayala' },
    { id: 'circuit' },
    { id: 'powerplant-mall' },
  ];
  assert.deepEqual(getDestinationChoices(destinations), destinations);
});

test('destination choices exclude only the origin and retain destinations without a route from it', () => {
  const destinations = [
    { id: 'one-ayala' },
    { id: 'circuit' },
    { id: 'powerplant-mall' },
  ];
  assert.deepEqual(getDestinationChoices(destinations, 'one-ayala'), [
    { id: 'circuit' },
    { id: 'powerplant-mall' },
  ]);
});

test('mode filters match exact stored transport types', () => {
  const options = [
    { route: { transportationType: 'bus' } },
    { route: { transportationType: 'e-bus' } },
  ];
  assert.deepEqual(filterOptionsByMode(options, 'bus'), [options[0]]);
  assert.deepEqual(filterOptionsByMode(options, 'e-jeep'), []);
});
