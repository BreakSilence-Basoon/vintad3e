import type { ScheduleRead } from './partner-schedule';
import type { LedgerRead } from './ledger-filter';

export function getPartnerFixture(env: string | undefined, enabled: string | undefined, today: string): { schedule: ScheduleRead; ledger: LedgerRead } {
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(`${today}T00:00:00.000Z`))) {
    return { schedule: { kind: 'ready', events: [] }, ledger: { kind: 'ready', rows: [] } };
  }
  return {
    schedule: { kind: 'ready', events: [{ id: 'rental-1', area: 'rental', title: '대관', startsAt: `${today}T00:00:00.000Z`, endsAt: `${today}T02:00:00.000Z` }] },
    ledger: { kind: 'ready', rows: [
      { id: 'rental-1', counterparty: '대관처', from: today, to: today, terms: [{ label: '대관료', value: '100,000원' }], amount: '100000', status: 'COMPLETED', completedAt: today, completedAmount: '100000', reference: '계약서' },
      { id: 'rental-2', counterparty: '대관처 02', from: today, to: today, terms: [{ label: '대관료', value: '80,000원' }], amount: '80000', status: 'PENDING', completedAt: null, completedAmount: '0', reference: '계약서' },
    ] },
  };
}
