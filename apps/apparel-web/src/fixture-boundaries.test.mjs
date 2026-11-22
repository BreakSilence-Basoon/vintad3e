import test from 'node:test';
import assert from 'node:assert/strict';
import { getInventoryCollection, getInventoryOptionFilters, belongsToInventoryCollection, variantMatchesInventoryOptionFilters, buildInventoryHref } from './inventory-collection.ts';
import { defaultRow, toDraft, editDraft, isDirty, validateDraft } from './inventory-stock.ts';
import { parseAuditFilters } from './audit-filters.ts';
import { readOnlineChecklist, saveOnlineChecklist } from './dashboard-online-storage.ts';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; }

test('collection filters handle supported, empty and unknown values', () => {
  assert.equal(getInventoryCollection({ collection: 'collab' }), 'collab');
  assert.equal(getInventoryCollection({}), 'in-house');
  assert.equal(getInventoryCollection({ collection: 'unknown' }), 'in-house');
  assert.equal(belongsToInventoryCollection({ businessDomain: 'APPAREL', lineCode: 'collab' }, 'collab'), true);
  assert.equal(belongsToInventoryCollection({ businessDomain: 'OTHER', lineCode: 'collab' }, 'collab'), false);
});

test('option filters preserve valid values and never show untracked variants', () => {
  const filters = getInventoryOptionFilters({ color: ' 검정 ', size: ['M', 'L'] });
  assert.equal(filters.color, '검정'); assert.equal(filters.size, 'M');
  const variant = { apparelType: null, color: '검정', size: 'M', apparelTarget: null, tracksInventory: true };
  assert.equal(variantMatchesInventoryOptionFilters(variant, filters), true);
  assert.equal(variantMatchesInventoryOptionFilters({ ...variant, tracksInventory: false }, filters), false);
  assert.equal(variantMatchesInventoryOptionFilters({ ...variant, color: null }, filters), false);
  assert.equal(buildInventoryHref({ collection: 'in-house', search: '' }), '/admin/products');
});

test('stock validation rejects nonnumeric and negative values without mutating drafts', () => {
  const row = defaultRow(), original = toDraft(row), draft = editDraft(original, 'target', '10', true);
  assert.equal(original.target, '0'); assert.equal(draft.shortage, '10');
  assert.equal(isDirty(row, draft), true);
  for (const onHand of ['-1', 'NaN', 'Infinity']) assert.ok('error' in validateDraft(row, { ...draft, onHand }));
  assert.ok('row' in validateDraft(row, { onHand: '3', target: '10', shortage: '7' }));
});

test('audit filters use safe defaults for empty and unknown values', () => {
  const empty = parseAuditFilters({});
  assert.equal(empty.range, 'all'); assert.equal(empty.keyword, '');
  const invalid = parseAuditFilters({ range: 'unknown', sort: 'invalid', from: 'bad', keyword: 'x'.repeat(100) });
  assert.equal(invalid.range, 'all'); assert.equal(invalid.sortDirection, 'desc'); assert.equal(invalid.from, ''); assert.equal(invalid.keyword.length, 80);
});

test('checklist storage preserves malformed data and handles unavailable storage', () => {
  const store = memory(), key = 'vintad3e-apparel-fixture-online-checklist';
  assert.deepEqual(readOnlineChecklist(store), { seongsuPicked: false, hanamPrepared: false });
  assert.equal(saveOnlineChecklist(store, { seongsuPicked: true, hanamPrepared: false }), true);
  store.setItem(key, '{bad');
  assert.equal(readOnlineChecklist(store), null);
  assert.equal(saveOnlineChecklist(store, { seongsuPicked: true, hanamPrepared: true }), false);
  assert.equal(store.getItem(key), '{bad');
  assert.equal(readOnlineChecklist({ getItem() { throw new Error('blocked'); } }), null);
});

test('sign-in notices handle missing and prototype-like values', () => {
  assert.equal(fixtureSignInNotice(''), null); assert.equal(fixtureSignInNotice(null), null);
  assert.ok(fixtureSignInNotice('AccessDenied')?.title);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
