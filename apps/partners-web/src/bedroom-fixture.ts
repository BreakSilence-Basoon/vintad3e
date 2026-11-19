import type { LedgerRead } from './ledger-filter';

export const samplePartner = { id: 'partner-01', name: '협업처 01', kind: '작품·의류 협업', terms: [{ label: '정산 조건', value: '판매금액의 5%' }], source: 'https://example.invalid/' } as const;
export function bedroomFixture(env: string | undefined, enabled: string | undefined, today: string): { partner: typeof samplePartner; ledger: LedgerRead } | null {
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(`${today}T00:00:00.000Z`)) || new Date(`${today}T00:00:00.000Z`).toISOString().slice(0, 10) !== today) return null;
  return { partner: samplePartner, ledger: { kind: 'ready', rows: [{ id: 'settlement-01', counterparty: samplePartner.name, from: today, to: today, terms: [...samplePartner.terms], amount: '5000', status: 'PENDING', completedAt: null, completedAmount: '0', reference: null }] } };
}
