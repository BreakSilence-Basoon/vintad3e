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
  assert.equal(parseHistoryPage('2.9'), 2);
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
