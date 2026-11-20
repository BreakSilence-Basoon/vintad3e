import type { AuditFilterFormState } from './audit-filter-form';

export function auditPage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(page) && page > 0 ? Math.max(1, Math.min(Math.floor(page), 200)) : 1;
}

export function auditNextHref(page: number, filters: AuditFilterFormState): string {
  const params = new URLSearchParams();
  if (filters.range !== 'all') params.set('range', filters.range);
  if (filters.range === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.actor !== 'all') params.set('actor', filters.actor);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.sortDirection !== 'desc') params.set('sort', filters.sortDirection);
  if (page > 1) params.set('auditPage', String(page));
  return `/admin/audit${params.size ? `?${params}` : ''}`;
}
