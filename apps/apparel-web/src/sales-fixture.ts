import type { SalesFilterFormState } from './sales-filter-form';

export type FixtureSale = { id: string; soldAt: string; item: string; quantity: number; amount: number; source: 'pos' | 'seongsu_ticket'; status: 'checked' | 'pending'; number: string };
const DAY = 86400000;
const dayOf = (time: number) => Math.floor((time + 9 * 3600000) / DAY);
function dayInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00+09:00`);
  return Number.isFinite(time) ? dayOf(time) : null;
}

export function getFixtureSales(env: string | undefined, enabled: string | undefined, now: Date): FixtureSale[] {
  if (env !== 'development' || enabled !== '1' || !Number.isFinite(now.getTime())) return [];
  const todayStart = dayOf(now.getTime()) * DAY - 9 * 3600000;
  return [
    ...(todayStart < now.getTime() ? [{ id: 'sale-1', soldAt: new Date(todayStart).toISOString(), item: '셔츠', quantity: 1, amount: 42000, source: 'pos' as const, status: 'checked' as const, number: 'POS-001' }] : []),
    { id: 'sale-2', soldAt: new Date(now.getTime() - 2 * DAY).toISOString(), item: '후드', quantity: 2, amount: 0, source: 'seongsu_ticket', status: 'pending', number: 'TICKET-001' },
  ];
}

export function filterFixtureSales(sales: FixtureSale[], filters: SalesFilterFormState, now: Date): FixtureSale[] {
  const today = dayOf(now.getTime());
  const first = filters.range === 'today' ? today : filters.range === '7d' ? today - 6 : filters.range === '30d' ? today - 29 : filters.range === 'custom' ? dayInput(filters.from) : null;
  const last = filters.range === 'today' || filters.range === '7d' || filters.range === '30d' ? today : filters.range === 'custom' ? dayInput(filters.to) : null;
  const keyword = filters.keyword.toLocaleLowerCase('ko-KR');
  return sales.filter(sale => {
    const day = dayOf(Date.parse(sale.soldAt));
    if (first !== null && day < first || last !== null && day > last) return false;
    if (filters.source !== 'all' && sale.source !== filters.source) return false;
    if (filters.status !== 'all' && sale.status !== filters.status) return false;
    const source = sale.source === 'pos' ? '성수 매장 POS' : '성수 매장 티켓';
    const status = sale.status === 'checked' ? '교차 검증 완료' : '교차 검증 대기';
    return !keyword || [sale.item, sale.number, source, status, '성수 매장'].some(value => value.toLocaleLowerCase('ko-KR').includes(keyword));
  }).toSorted((a, b) => filters.sortDirection === 'asc' ? a.soldAt.localeCompare(b.soldAt) : b.soldAt.localeCompare(a.soldAt));
}
