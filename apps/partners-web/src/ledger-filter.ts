// [AI 판단] Display-only ledger values. No tax/rate calculations or inferred payment completion.
export type SettlementRow = {
  id: string;
  counterparty: string;
  from: string;
  to: string;
  terms: { label: string; value: string }[] | null;
  amount: string | null;
  status: 'UNKNOWN' | 'PENDING' | 'COMPLETED';
  completedAt: string | null;
  completedAmount: string | null;
  reference: string | null;
};
export type LedgerRead = { kind: 'ready'; rows: SettlementRow[] } | { kind: 'unavailable' | 'denied' };
export type LedgerFilter = { from: string; to: string; query: string; status: string };
export function filterLedger(rows: SettlementRow[], filter: LedgerFilter): SettlementRow[] {
  return rows.filter(row => (!filter.from || row.to >= filter.from) && (!filter.to || row.from <= filter.to) && (!filter.status || row.status === filter.status) && row.counterparty.toLocaleLowerCase('ko-KR').includes(filter.query.trim().toLocaleLowerCase('ko-KR'))).toSorted((a, b) => b.to.localeCompare(a.to) || a.id.localeCompare(b.id));
}
