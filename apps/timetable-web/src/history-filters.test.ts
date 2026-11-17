import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHistoryFilters } from './history-filters.ts';

test('attendance filter defaults and invalid custom periods match the original', () => {
  assert.equal(parseHistoryFilters({}).range, 'last7');
  assert.deepEqual(parseHistoryFilters({ range: 'custom', from: '2026-12-10', to: '2026-12-01' }),
    { employee: 'all', from: '', range: 'all', sort: 'desc', to: '' });
  assert.equal(parseHistoryFilters({ range: 'today', sort: 'asc' }).sort, 'asc');
  assert.equal(parseHistoryFilters({ range: 'invalid' }).range, 'all');
});
