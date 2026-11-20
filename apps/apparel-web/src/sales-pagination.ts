import type { SalesFilterFormState } from './sales-filter-form';

export function salesPage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), 200) : 1;
}

export function salesNextHref(page: number, filters: SalesFilterFormState): string {
  const params = new URLSearchParams();
  if (filters.range !== 'all') params.set('range', filters.range);
  if (filters.range === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.source !== 'all') params.set('source', filters.source);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.sortDirection !== 'desc') params.set('sort', filters.sortDirection);
  if (page > 1) params.set('salesPage', String(page));
  return `/admin/sales${params.size ? `?${params}` : ''}`;
}
