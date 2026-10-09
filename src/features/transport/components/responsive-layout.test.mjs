import assert from 'node:assert/strict';
import test from 'node:test';

import { ridePlannerMinWidth } from './responsive-layout.ts';

test('planner fits within the padded content width on a 320px phone', () => {
  assert.equal(ridePlannerMinWidth(320, 32), 288);
});

test('planner keeps its preferred readable minimum on wider screens', () => {
  assert.equal(ridePlannerMinWidth(390, 32), 300);
  assert.equal(ridePlannerMinWidth(1024, 32), 300);
});
