import { newCount, parseCounts } from './inventory-counts.mjs';

const uuid = /^fixture-[0-9a-f-]{36}$/;
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function parsePurchases(text, ingredients) {
  if (text === null) return [];
  try {
    const records = JSON.parse(text);
    if (!Array.isArray(records) || records.length > 100 || new Set(records.map(x => x?.id)).size !== records.length) return null;
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).sort().join(',') !== 'id,kind,lines,occurredAt,receivedAt,reference,status,supplier' || !uuid.test(record.id) || record.kind !== 'PURCHASE' || !['ORDERED','RECEIVED','VOID'].includes(record.status) || typeof record.supplier !== 'string' || record.supplier !== record.supplier.trim() || !record.supplier || record.supplier.length > 160 || /[\u0000-\u001f\u007f]/.test(record.supplier) || !(record.reference === null || typeof record.reference === 'string' && record.reference === record.reference.trim() && record.reference.length <= 300 && !/[\u0000-\u001f\u007f]/.test(record.reference)) || !validTime(record.occurredAt) || !(record.receivedAt === null || validTime(record.receivedAt)) || record.status === 'ORDERED' && record.receivedAt !== null || record.status === 'RECEIVED' && record.receivedAt === null) return null;
      if (record.receivedAt !== null && record.receivedAt < record.occurredAt) return null;
      const count = { id:record.id, kind:'COUNT', status:'RECORDED', supplier:null, reference:null, occurredAt:record.occurredAt, lines:record.lines };
      if (!parseCounts(JSON.stringify([count]), ingredients) || record.lines.some(line => line.quantity <= 0)) return null;
    }
    return records;
  } catch { return null; }
}
export function newPurchase(supplier, reference, status, date, time, ids, quantities, ingredients, now = Date.now()) {
  const count = newCount(date,time,ids,quantities,ingredients,now);
  if (!count || !['ORDERED','RECEIVED'].includes(status)) return null;
  const record = { ...count, kind:'PURCHASE', status, supplier:supplier.trim(), reference:reference.trim() || null, receivedAt:status === 'RECEIVED' ? count.occurredAt : null };
  return parsePurchases(JSON.stringify([record]),ingredients)?.[0] ?? null;
}
export function applyPurchases(rows, purchases, now = Date.now()) {
  return rows.map(row => {
    if (row.expectedQuantity === null || !row.countAt) return row;
    const received = purchases.filter(record => record.status === 'RECEIVED' && record.receivedAt && Date.parse(record.receivedAt) > Date.parse(row.countAt) && Date.parse(record.receivedAt) <= now).flatMap(record => record.lines.filter(line => line.ingredientId === row.id));
    const expectedQuantity = Math.round((row.expectedQuantity + received.reduce((sum,line) => sum + line.quantity,0))*1000)/1000;
    return { ...row, expectedQuantity, remainingDays:expectedQuantity >= 0 && row.used30 > 0 ? Math.round(expectedQuantity/(row.used30/30)) : null };
  });
}
