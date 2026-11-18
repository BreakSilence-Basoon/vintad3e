import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFixtureStock } from './inventory-fixture-session.ts';

test('only known fixture stock with valid values is restored', () => {
  const key = 'basic:seongsu:TSHIRT-001-BK-M';
  const valid = { onHand: 3, target: 10, shortage: 7, tracking: true };
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: valid, 'unrelated': valid })), { [key]: valid });
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, shortage: 8 } })), {});
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, onHand: -1 } })), {});
  assert.deepEqual(parseFixtureStock('{'), {});
  assert.deepEqual(parseFixtureStock('x'.repeat(16001)), {});
});
