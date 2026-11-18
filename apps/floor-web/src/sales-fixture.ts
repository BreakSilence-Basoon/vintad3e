import type { SalesFilters } from './sales-filters';

export type FixtureSale = { id: string; soldAt: string; sourceSystem: 'POS' | 'CAFE24' | 'OPENCLAW'; paymentStatus: 'PAID' | 'PARTIALLY_CANCELLED' | 'CANCELLED'; items: { name: string; quantity: number }[]; netAmountValue: number; currencyCode: string };
export function getSalesFixtures(env: string | undefined, enabled: string | undefined, now: Date): FixtureSale[] {
  if (env !== 'development' || enabled !== '1' || !Number.isFinite(now.getTime())) return [];
  const when = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  return [
    { id: 'sale-1', soldAt: when(0), sourceSystem: 'POS', paymentStatus: 'PAID', items: [{ name: '드립 커피', quantity: 2 }], netAmountValue: 12000, currencyCode: 'KRW' },
    { id: 'sale-2', soldAt: when(1), sourceSystem: 'CAFE24', paymentStatus: 'PARTIALLY_CANCELLED', items: [{ name: '쿠키', quantity: 1 }], netAmountValue: 4000, currencyCode: 'KRW' },
    { id: 'sale-3', soldAt: when(2), sourceSystem: 'OPENCLAW', paymentStatus: 'PAID', items: [{ name: '차', quantity: 1 }], netAmountValue: 0, currencyCode: 'KRW' },
    ...Array.from({ length: 18 }, (_, index): FixtureSale => ({ id: `sale-${index + 4}`, soldAt: when(index + 3), sourceSystem: 'POS', paymentStatus: 'PAID', items: [{ name: '주스', quantity: 1 }], netAmountValue: 5000, currencyCode: 'KRW' })),
  ];
}

export function filterSalesFixtures(sales: FixtureSale[], filters: SalesFilters): FixtureSale[] {
  const keyword = filters.keyword.toLocaleLowerCase('ko-KR');
  return sales.filter(sale => (!filters.dateFrom || new Date(sale.soldAt) >= filters.dateFrom) && (!filters.dateTo || new Date(sale.soldAt) < filters.dateTo) && (!keyword || sale.items.some(item => item.name.toLocaleLowerCase('ko-KR').includes(keyword))))
    .toSorted((a, b) => (a.soldAt.localeCompare(b.soldAt) || a.id.localeCompare(b.id)) * (filters.sortDirection === 'asc' ? 1 : -1));
}

export function paginateSalesFixtures(sales: FixtureSale[], page: number): FixtureSale[] {
  return sales.slice(0, page * 18);
}
