import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHistoryHref, parseHistoryFilters, parseHistoryPage } from './history-filters.ts';

test('attendance filter defaults and invalid custom periods match the original', () => {
  assert.equal(parseHistoryFilters({}).range, 'last7');
  assert.deepEqual(parseHistoryFilters({ range: 'custom', from: '2026-12-10', to: '2026-12-01' }),
    { employee: 'all', from: '', range: 'all', sort: 'desc', to: '' });
  assert.equal(parseHistoryFilters({ range: 'today', sort: 'asc' }).sort, 'asc');
  assert.equal(parseHistoryFilters({ range: 'invalid' }).range, 'all');
});

test('attendance pagination preserves the selected range and sort', () => {
  assert.equal(parseHistoryPage(undefined), 1);
  assert.equal(parseHistoryPage('9999'), 1000);
  assert.equal(parseHistoryPage('2.9'), 1);
  const filters = parseHistoryFilters({ range: 'all', sort: 'asc' });
  const href = buildHistoryHref(filters, 2);
  const params = new URL(href, 'http://localhost').searchParams;
  assert.equal(params.get('range'), 'all');
  assert.equal(params.get('sort'), 'asc');
  assert.equal(params.get('historyPage'), '2');
  assert.equal(parseHistoryFilters(Object.fromEntries(params)).range, 'all');
  const staffId = '00000000-0000-4000-8000-000000000001';
  const staff = parseHistoryFilters({ employee: staffId });
  assert.equal(new URL(buildHistoryHref(staff, 1, true), 'http://localhost').searchParams.get('employee'), staffId);
  assert.equal(new URL(buildHistoryHref(staff, 1), 'http://localhost').searchParams.has('employee'), false);
});

test('invalid calendar dates and fractional page numbers fail closed', () => {
  for (const value of ['2026-02-30', '2026-02-29', '2026-04-31', '2026-13-01']) {
    assert.deepEqual(parseHistoryFilters({ range: 'custom', from: value, to: '2026-12-31' }), { employee: 'all', from: '', range: 'all', sort: 'desc', to: '' });
  }
  assert.equal(parseHistoryFilters({ range: 'custom', from: '2028-02-29', to: '2028-02-29' }).range, 'custom');
  for (const value of ['0.5', '2.0', '2.9', '-1', '1e2', '']) assert.equal(parseHistoryPage(value), 1);
  assert.equal(parseHistoryPage('2'), 2);
  assert.equal(parseHistoryPage('1001'), 1000);
});

test('attendance periods, ordering and employee visibility survive pagination', () => {
  const employee = '00000000-0000-4000-8000-000000000001';
  for (const range of ['all', 'today', 'last7', 'last30', 'custom']) {
    for (const sort of ['asc', 'desc']) {
      for (const includeEmployee of [false, true]) {
        const filters = parseHistoryFilters({ range, sort, employee, from: '2026-09-01', to: '2026-09-30' });
        const url = new URL(buildHistoryHref(filters, 2, includeEmployee), 'http://localhost');
        const restored = parseHistoryFilters(Object.fromEntries(url.searchParams));
        assert.equal(restored.range, range);
        assert.equal(restored.sort, sort);
        assert.equal(restored.employee, includeEmployee ? employee : 'all');
        assert.equal(url.searchParams.get('historyPage'), '2');
        if (range === 'custom') {
          assert.equal(restored.from, '2026-09-01');
          assert.equal(restored.to, '2026-09-30');
        }
      }
    }
  }
});
