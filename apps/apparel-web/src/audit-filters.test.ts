import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAuditFilters } from './audit-filters.ts';
import { getFixtureAudit, filterFixtureAudit } from './audit-fixture.ts';

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

test('synthetic audit entries honor explicit opt-in, KST dates, filters and ordering', () => {
  const now = new Date('2026-11-19T03:00:00.000Z');
  const entries = getFixtureAudit('development', '1', now);
  assert.deepEqual(getFixtureAudit('production', '1', now), []);
  assert.deepEqual(getFixtureAudit('development', undefined, now), []);
  assert.equal(entries.length, 3);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ range: 'today' }), now).map(item => item.id), ['audit-1']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ actor: 'ai' }), now).map(item => item.id), ['audit-2']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ range: 'custom', from: '2026-11-17', to: '2026-11-17' }), now).map(item => item.id), ['audit-2']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ keyword: '재고', actor: 'staff1' }), now).map(item => item.id), ['audit-1']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ sort: 'asc' }), now).map(item => item.id), ['audit-3', 'audit-2', 'audit-1']);
});
