import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultRow, editDraft, isDirty, toDraft, validateDraft } from './inventory-stock.ts';

test('stock edits calculate shortage and dirty state against saved values', () => {
  const row = defaultRow();
  const target = editDraft(toDraft(row), 'target', '10', true);
  const draft = editDraft(target, 'onHand', '3', true);
  assert.equal(draft.shortage, '7');
  assert.equal(isDirty(row, draft), true);
  const result = validateDraft(row, draft);
  assert.ok('row' in result);
  assert.deepEqual(result.row, { onHand: 3, target: 10, shortage: 7, tracking: true });
  assert.equal(isDirty(result.row, draft), false);
});

test('rejects invalid and inconsistent quantities using source messages', () => {
  const row = defaultRow(), draft = toDraft(row);
  assert.deepEqual(validateDraft(row, { ...draft, onHand: '-1' }), { error: '현재 수량은 0 이상의 숫자만 입력할 수 있습니다.' });
  assert.deepEqual(validateDraft(row, { ...draft, target: '-1' }), { error: '목표재고는 0 이상의 숫자만 입력할 수 있습니다.' });
  assert.deepEqual(validateDraft(row, { ...draft, shortage: '-1' }), { error: '부족 수량은 0 이상의 숫자만 입력할 수 있습니다.' });
  assert.deepEqual(validateDraft(row, { ...draft, target: '10', shortage: '11' }), { error: '부족 수량은 목표재고보다 클 수 없습니다.' });
  assert.deepEqual(validateDraft(row, { ...draft, onHand: '3', target: '10', shortage: '4' }), { error: '부족 수량은 목표재고와 현재 수량 기준으로 계산된 값이어야 합니다.' });
  assert.deepEqual(validateDraft({ ...row, tracking: false }, { ...draft, target: '-1', shortage: '-1' }), { row: { ...row, tracking: false } });
});

test('stock validation handles zero, excess stock, fractional tolerance and untracked options', () => {
  const row = defaultRow();
  for (const value of ['-1', 'NaN', 'Infinity']) {
    assert.deepEqual(validateDraft(row, { onHand: value, target: '0', shortage: '0' }), { error: '현재 수량은 0 이상의 숫자만 입력할 수 있습니다.' });
    assert.deepEqual(validateDraft(row, { onHand: '0', target: value, shortage: '0' }), { error: '목표재고는 0 이상의 숫자만 입력할 수 있습니다.' });
    assert.deepEqual(validateDraft(row, { onHand: '0', target: '0', shortage: value }), { error: '부족 수량은 0 이상의 숫자만 입력할 수 있습니다.' });
  }
  assert.ok('row' in validateDraft(row, { onHand: '0', target: '0', shortage: '3' }));
  assert.ok('row' in validateDraft(row, { onHand: '12', target: '10', shortage: '0' }));
  assert.ok('row' in validateDraft(row, { onHand: '3', target: '10', shortage: '7.0000005' }));
  assert.deepEqual(validateDraft(row, { onHand: '3', target: '10', shortage: '7.000002' }), { error: '부족 수량은 목표재고와 현재 수량 기준으로 계산된 값이어야 합니다.' });
  const untracked = { ...row, tracking: false };
  assert.ok('row' in validateDraft(untracked, { onHand: '2', target: 'NaN', shortage: '-10' }));
  assert.deepEqual(validateDraft({ ...row, workQty: 1000001 }, toDraft(row)), { error: '작업수량을 확인해주세요.' });
  assert.ok('row' in validateDraft({ ...row, workQty: 1000000 }, toDraft(row)));
});
import { fixtureInventoryRequest } from './shortage-fixture-request.ts';
import { readFixtureStock } from './inventory-fixture-session.ts';

test('shortage saves are restricted to known fixtures and reuse tab stock', async () => {
  const values = new Map<string, string>();
  let rejectWrites = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (rejectWrites) throw new Error('unavailable'); values.set(key, value); } };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage } });
  try {
    const key = 'basic:seongsu:TSHIRT-001-BK-M';
    const input = { stockTargetId: key, skuId: 'TSHIRT-001-BK-M', skuCode: 'TSHIRT-001-BK-M', locationId: 'seongsu', locationCode: 'seongsu', onHandQty: 3, targetQty: 10, shortageQty: 7 };
    const request = (body: object) => fixtureInventoryRequest('/api/admin/stock-target-shortage', { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await request(input)).status, 200);
    assert.deepEqual(readFixtureStock()[key], { onHand: 3, target: 10, shortage: 7, tracking: true });
    assert.equal((await request({ ...input, shortageQty: 6 })).status, 400);
    assert.equal((await request({ ...input, skuCode: 'unknown' })).status, 400);
    rejectWrites = true;
    assert.equal((await request({ ...input, onHandQty: 4, shortageQty: 6 })).status, 503);
    assert.equal(readFixtureStock()[key].onHand, 3);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window');
  }
});
