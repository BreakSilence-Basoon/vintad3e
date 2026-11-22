import type { AuditFilterFormState } from './audit-filter-form';

type Params = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function allowed<T extends string>(value: string | undefined, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback;
}
const date = (value: string | undefined) => {
  const text = value?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : '';
};

export function parseAuditFilters(params: Params): AuditFilterFormState {
  return {
    range: allowed(single(params.range), ['all', 'today', '7d', '30d', 'custom'] as const, 'all'),
    actor: allowed(single(params.actor), ['all', 'staff1', 'representative', 'staff2', 'ai', 'system'] as const, 'all'),
    sortDirection: single(params.sort) === 'asc' ? 'asc' : 'desc',
    from: date(single(params.from)), to: date(single(params.to)), keyword: (single(params.keyword)?.trim() ?? '').slice(0, 80),
  };
}
