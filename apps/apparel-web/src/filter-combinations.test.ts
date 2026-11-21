import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSalesFilters } from './sales-filters.ts';
import { salesNextHref } from './sales-pagination.ts';
import { filterFixtureSales, getFixtureSales } from './sales-fixture.ts';
import { parseAuditFilters } from './audit-filters.ts';
import { auditNextHref } from './audit-pagination.ts';
import { filterFixtureAudit, getFixtureAudit } from './audit-fixture.ts';
import { buildInventoryHref, getInventoryCollection, getInventoryOptionFilters, variantMatchesInventoryOptionFilters } from './inventory-collection.ts';

const now = new Date('2026-11-19T03:00:00.000Z');
const ranges = ['all', 'today', '7d', '30d', 'custom'];
const sorts = ['asc', 'desc'];

test('every selection of the four inventory option filters survives navigation and requires a tracked matching option', () => {
  const variant = { apparelType: '반팔', color: '검정', size: 'M', apparelTarget: 'WOMEN', tracksInventory: true };
  for (const collection of ['in-house', 'collab'] as const) for (let mask = 0; mask < 16; mask++) {
    const filters = { apparelType: mask & 1 ? '반팔' : '', color: mask & 2 ? '검정' : '', size: mask & 4 ? 'M' : '', target: mask & 8 ? 'WOMEN' : '' };
    const url = new URL(buildInventoryHref({ collection, search: ' 상품 ', ...filters }), 'http://example.invalid');
    assert.equal(getInventoryCollection(Object.fromEntries(url.searchParams)), collection);
    assert.deepEqual(getInventoryOptionFilters(Object.fromEntries(url.searchParams)), filters);
    assert.equal(url.searchParams.get('search'), '상품');
    assert.equal(variantMatchesInventoryOptionFilters(variant, filters), true);
    assert.equal(variantMatchesInventoryOptionFilters({ ...variant, tracksInventory: false }, filters), false);
    for (const key of Object.keys(filters) as (keyof typeof filters)[]) {
      if (filters[key]) assert.equal(variantMatchesInventoryOptionFilters(variant, { ...filters, [key]: '다른 값' }), false);
    }
  }
});

test('every sales filter choice survives pagination and respects source, status and ordering', () => {
  const all = getFixtureSales('development', '1', now);
  const original = structuredClone(all);
  for (const range of ranges) for (const source of ['all', 'cafe24', 'seongsu_ticket', 'pos']) for (const status of ['all', 'checked', 'pending', 'unavailable', 'not_required']) for (const sort of sorts) for (const keyword of ['', '모자']) {
    const values = { range, source, status, sort, keyword, ...(range === 'custom' ? { from: '2026-01-01', to: '2026-12-31' } : {}) };
    const filters = parseSalesFilters(values);
    const url = new URL(salesNextHref(2, filters), 'http://example.invalid');
    assert.deepEqual(parseSalesFilters(Object.fromEntries(url.searchParams)), filters);
    assert.equal(url.searchParams.get('salesPage'), '2');
    const result = filterFixtureSales(all, filters, now);
    assert.ok(result.every(item => (source === 'all' || item.source === source) && (status === 'all' || item.status === status)));
    assert.ok(result.every((item, index) => index === 0 || (sort === 'asc' ? result[index - 1].soldAt <= item.soldAt : result[index - 1].soldAt >= item.soldAt)));
  }
  assert.deepEqual(all, original);
});

test('every audit filter choice survives pagination and keeps the original records unchanged', () => {
  const all = getFixtureAudit('development', '1', now);
  const original = structuredClone(all);
  for (const range of ranges) for (const actor of ['all', 'staff1', 'representative', 'staff2', 'ai', 'system']) for (const sort of sorts) for (const keyword of ['', '재고']) {
    const values = { range, actor, sort, keyword, ...(range === 'custom' ? { from: '2026-01-01', to: '2026-12-31' } : {}) };
    const filters = parseAuditFilters(values);
    const url = new URL(auditNextHref(2, filters), 'http://example.invalid');
    assert.deepEqual(parseAuditFilters(Object.fromEntries(url.searchParams)), filters);
    assert.equal(url.searchParams.get('auditPage'), '2');
    const result = filterFixtureAudit(all, filters, now);
    assert.ok(result.every(item => actor === 'all' || item.actor === actor));
    assert.ok(result.every(item => !keyword || `${item.actorLabel} ${item.summary}`.includes(keyword)));
    assert.ok(result.every((item, index) => index === 0 || (sort === 'asc' ? result[index - 1].occurredAt <= item.occurredAt : result[index - 1].occurredAt >= item.occurredAt)));
  }
  assert.deepEqual(all, original);
});
