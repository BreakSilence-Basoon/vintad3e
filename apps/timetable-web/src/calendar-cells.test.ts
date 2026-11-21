import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyCalendarCells } from './calendar-cells.ts';

test('calendar contains complete weeks, adjacent months and leap day', () => {
  const cells = emptyCalendarCells('2024-02');
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0].dateKey, '2024-01-28');
  assert.equal(cells.at(-1)?.dateKey, '2024-03-02');
  assert.ok(cells.some(cell => cell.dateKey === '2024-02-29' && !cell.outside));
  assert.equal(cells[0].weekday, '일');
  assert.throws(() => emptyCalendarCells('2024-13'));
});

test('every month in leap and ordinary years shows each day once in complete weeks', () => {
  for (const year of [2024, 2025, 2026]) {
    for (let month = 1; month <= 12; month++) {
      const cells = emptyCalendarCells(`${year}-${String(month).padStart(2, '0')}`);
      const inside = cells.filter(cell => !cell.outside);
      const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
      assert.equal(cells.length % 7, 0);
      assert.equal(new Set(cells.map(cell => cell.dateKey)).size, cells.length);
      assert.deepEqual(inside.map(cell => cell.day), Array.from({ length: count }, (_, index) => index + 1));
      assert.equal(cells[0].weekday, '일');
      assert.equal(cells.at(-1)?.weekday, '토');
    }
  }
});
