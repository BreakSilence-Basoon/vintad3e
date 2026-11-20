import test from 'node:test';
import assert from 'node:assert/strict';
import { salesNextHref, salesPage } from './sales-pagination.ts';
import { parseSalesFilters } from './sales-filters.ts';

test('sales pagination bounds page values and preserves selected filters', () => {
  assert.equal(salesPage(undefined), 1);
  assert.equal(salesPage('-1'), 1);
  assert.equal(salesPage('500'), 200);
  assert.equal(salesPage(['2', '3']), 2);
  const filters = parseSalesFilters({ range: 'custom', from: '2026-01-01', to: '2026-01-31', source: 'pos', status: 'checked', keyword: '모자', sort: 'asc' });
  const url = new URL(salesNextHref(2, filters), 'http://example.invalid');
  assert.equal(url.pathname, '/admin/sales');
  for (const [key, value] of Object.entries({ range: 'custom', from: '2026-01-01', to: '2026-01-31', source: 'pos', status: 'checked', keyword: '모자', sort: 'asc', salesPage: '2' })) assert.equal(url.searchParams.get(key), value);
});
