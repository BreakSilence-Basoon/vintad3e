import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAuditFilters } from './audit-filters.ts';

test('audit filters allow only synthetic actors and bound user input', () => {
  const filters = parseAuditFilters({ actor: 'staff1', range: 'custom', from: '2026-01-01', to: 'invalid', sort: 'asc', keyword: ` ${'a'.repeat(90)} ` });
  assert.equal(filters.actor, 'staff1');
  assert.equal(filters.range, 'custom');
  assert.equal(filters.from, '2026-01-01');
  assert.equal(filters.to, '');
  assert.equal(filters.sortDirection, 'asc');
  assert.equal(filters.keyword.length, 80);
  assert.equal(parseAuditFilters({ actor: 'unknown' }).actor, 'all');
});
