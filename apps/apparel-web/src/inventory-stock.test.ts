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
