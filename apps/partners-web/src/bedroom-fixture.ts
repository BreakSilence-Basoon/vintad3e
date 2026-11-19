import type { LedgerRead } from './ledger-filter';

export const samplePartners = [
  { id: 'partner-01', name: '협업처 01', kind: '작품·의류 협업', terms: [{ label: '정산 조건', value: '판매금액의 5%' }], source: 'https://example.invalid/' },
  { id: 'partner-02', name: '협업처 02', kind: '작품·의류 협업', terms: [{ label: '정산 조건', value: '판매금액의 7%' }], source: 'https://example.invalid/' },
] as const;
export function bedroomFixtures(env: string | undefined, enabled: string | undefined, today: string): typeof samplePartners | null {
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(`${today}T00:00:00.000Z`)) || new Date(`${today}T00:00:00.000Z`).toISOString().slice(0, 10) !== today) return null;
  return samplePartners;
}
export function bedroomFixture(env: string | undefined, enabled: string | undefined, today: string, id = 'partner-01'): { partner: typeof samplePartners[number]; ledger: LedgerRead } | null {
  const partner = bedroomFixtures(env, enabled, today)?.find(item => item.id === id);
  if (!partner) return null;
  const completed = partner.id === 'partner-02', amount = completed ? '7000' : '5000';
  return { partner, ledger: { kind: 'ready', rows: [{ id: `settlement-${partner.id}`, counterparty: partner.name, from: today, to: today, terms: [...partner.terms], amount, status: completed ? 'COMPLETED' : 'PENDING', completedAt: completed ? today : null, completedAmount: completed ? amount : '0', reference: null }] } };
}
