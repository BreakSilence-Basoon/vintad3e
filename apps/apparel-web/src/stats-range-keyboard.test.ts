import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRangeForKey } from './stats-range-keyboard.ts';

test('range handles follow keyboard increments and cannot cross their minimum gap', () => {
  const current = { s: 0.2, e: 0.8 };
  const move = (which: 'start' | 'end', key: string) => nextRangeForKey(current, 0.1, 0.01, which, key);
  assert.ok(Math.abs(move('start', 'ArrowRight')!.s - 0.21) < 1e-10);
  assert.ok(Math.abs(move('start', 'ArrowUp')!.s - 0.21) < 1e-10);
  assert.ok(Math.abs(move('start', 'ArrowLeft')!.s - 0.19) < 1e-10);
  assert.ok(Math.abs(move('start', 'ArrowDown')!.s - 0.19) < 1e-10);
  assert.ok(Math.abs(move('end', 'Home')!.e - 0.3) < 1e-10);
  assert.equal(move('end', 'End')?.e, 1);
  assert.equal(move('start', 'Home')?.s, 0);
  assert.ok(Math.abs(move('start', 'End')!.s - 0.7) < 1e-10);
  assert.ok(Math.abs(move('start', 'PageUp')!.s - 0.27) < 1e-10);
  assert.ok(Math.abs(move('end', 'PageDown')!.e - 0.73) < 1e-10);
  assert.deepEqual(nextRangeForKey({ s: 0, e: 1 }, 0.1, 0.01, 'start', 'ArrowLeft'), { s: 0, e: 1 });
  assert.deepEqual(nextRangeForKey({ s: 0, e: 1 }, 0.1, 0.01, 'end', 'ArrowRight'), { s: 0, e: 1 });
  assert.deepEqual(nextRangeForKey({ s: 0, e: 1 }, 1, 1, 'start', 'End'), { s: 0, e: 1 });
  assert.deepEqual(nextRangeForKey({ s: 0, e: 1 }, 1, 1, 'end', 'Home'), { s: 0, e: 1 });
  assert.equal(move('start', 'Escape'), null);
});
