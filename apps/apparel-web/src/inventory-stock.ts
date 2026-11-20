export type Row = { onHand: number; target: number; shortage: number; tracking: boolean; workQty?: number };
export type Rows = Record<string, Row>;
export type Draft = { onHand: string; target: string; shortage: string };
export const defaultRow = (): Row => ({ onHand: 0, target: 0, shortage: 0, tracking: true });
export const toDraft = (row: Row): Draft => ({ onHand: String(row.onHand), target: String(row.target), shortage: String(row.shortage) });

export function isDirty(row: Row, draft: Draft): boolean {
  const same = (value: string, original: number) => Number.isFinite(Number(value)) && Number(value) === original;
  return !same(draft.onHand, row.onHand) || (row.tracking && (!same(draft.target, row.target) || !same(draft.shortage, row.shortage)));
}

export function editDraft(draft: Draft, field: keyof Draft, value: string, tracking: boolean): Draft {
  const next = { ...draft, [field]: value };
  const onHand = Number(next.onHand), target = Number(next.target);
  if (tracking && field !== 'shortage' && target > 0 && Number.isFinite(target) && Number.isFinite(onHand)) next.shortage = String(Math.max(target - onHand, 0));
  return next;
}

export function validateDraft(row: Row, draft: Draft): { error: string } | { row: Row } {
  const onHand = Number(draft.onHand), target = row.tracking ? Number(draft.target) : 0, shortage = row.tracking ? Number(draft.shortage) : 0;
  if (!Number.isFinite(onHand) || onHand < 0) return { error: '현재 수량은 0 이상의 숫자만 입력할 수 있습니다.' };
  if (row.tracking && (!Number.isFinite(target) || target < 0)) return { error: '목표재고는 0 이상의 숫자만 입력할 수 있습니다.' };
  if (row.tracking && (!Number.isFinite(shortage) || shortage < 0)) return { error: '부족 수량은 0 이상의 숫자만 입력할 수 있습니다.' };
  if (row.tracking && target > 0 && shortage > target) return { error: '부족 수량은 목표재고보다 클 수 없습니다.' };
  if (row.tracking && target > 0 && Math.abs(Math.max(target - onHand, 0) - shortage) > 0.000001) return { error: '부족 수량은 목표재고와 현재 수량 기준으로 계산된 값이어야 합니다.' };
  if (row.workQty !== undefined && (!Number.isFinite(row.workQty) || row.workQty < 0 || row.workQty > 1000000)) return { error: '작업수량을 확인해주세요.' };
  return { row: { onHand, target, shortage, tracking: row.tracking, ...(row.workQty === undefined ? {} : { workQty: row.workQty }) } };
}
