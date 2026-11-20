import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAuditFilters } from './audit-filters.ts';
import { getFixtureAudit, filterFixtureAudit } from './audit-fixture.ts';
import { auditNextHref, auditPage } from './audit-pagination.ts';

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
  assert.equal(entries.length, 13);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ range: 'today' }), now).map(item => item.id), ['audit-1']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ actor: 'ai' }), now).map(item => item.id), ['audit-2']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ range: 'custom', from: '2026-11-17', to: '2026-11-17' }), now).map(item => item.id), ['audit-2']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ keyword: '재고', actor: 'staff1' }), now).map(item => item.id), ['audit-1']);
  assert.deepEqual(filterFixtureAudit(entries, parseAuditFilters({ sort: 'asc' }), now).slice(-3).map(item => item.id), ['audit-3', 'audit-2', 'audit-1']);
});

test('audit pagination is bounded and preserves selected filters', () => {
  assert.equal(auditPage('0'), 1); assert.equal(auditPage('999'), 200); assert.equal(auditPage('2.9'), 2);
  const filters = parseAuditFilters({ range: 'custom', from: '2026-01-01', to: '2026-01-31', actor: 'system', keyword: '상품', sort: 'asc' });
  const url = new URL(auditNextHref(2, filters), 'https://example.invalid');
  assert.equal(url.searchParams.get('auditPage'), '2'); assert.equal(url.searchParams.get('keyword'), '상품');
  assert.equal(url.searchParams.get('range'), 'custom'); assert.equal(url.searchParams.get('from'), '2026-01-01');
  assert.equal(url.searchParams.get('actor'), 'system'); assert.equal(url.searchParams.get('sort'), 'asc');
});
