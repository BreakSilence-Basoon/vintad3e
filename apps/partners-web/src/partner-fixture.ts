import type { ScheduleRead } from './partner-schedule';
import type { LedgerRead } from './ledger-filter';

export function getPartnerFixture(env: string | undefined, enabled: string | undefined, today: string): { schedule: ScheduleRead; ledger: LedgerRead } {
  const instant = Date.parse(`${today}T00:00:00.000Z`);
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== today) {
    return { schedule: { kind: 'ready', events: [] }, ledger: { kind: 'ready', rows: [] } };
  }
  return {
    schedule: { kind: 'ready', events: [{ id: 'rental-1', area: 'rental', title: '대관', startsAt: `${today}T00:00:00.000Z`, endsAt: `${today}T02:00:00.000Z` }, { id: 'bedroom-1', area: 'proj-bedroom', title: '협업', startsAt: `${today}T03:00:00.000Z`, endsAt: `${today}T05:00:00.000Z` }, { id: 'dj-1', area: 'dj', title: 'DJ', startsAt: `${today}T06:00:00.000Z`, endsAt: `${today}T08:00:00.000Z` }] },
    ledger: { kind: 'ready', rows: [
      { id: 'rental-1', counterparty: '대관처', from: today, to: today, terms: [{ label: '대관료', value: '100,000원' }], amount: '100000', status: 'COMPLETED', completedAt: today, completedAmount: '100000', reference: '계약서' },
      { id: 'rental-2', counterparty: '대관처 02', from: today, to: today, terms: [{ label: '대관료', value: '80,000원' }], amount: '80000', status: 'PENDING', completedAt: null, completedAmount: '0', reference: '계약서' },
    ] },
  };
}

export function getDjFixture(env: string | undefined, enabled: string | undefined, today: string): LedgerRead {
  const instant = Date.parse(`${today}T00:00:00.000Z`);
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== today) return { kind: 'ready', rows: [] };
  return { kind: 'ready', rows: [
    { id: 'dj-1', counterparty: 'DJ 01', from: today, to: today, terms: [{ label: '출연료', value: '100,000원' }], amount: '100000', status: 'COMPLETED', completedAt: today, completedAmount: '100000', reference: '계약서' },
    { id: 'dj-2', counterparty: 'DJ 02', from: today, to: today, terms: [{ label: '출연료', value: '80,000원' }], amount: '80000', status: 'PENDING', completedAt: null, completedAmount: '0', reference: '계약서' },
  ] };
}
