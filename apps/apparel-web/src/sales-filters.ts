import type { SalesFilterFormState } from './sales-filter-form';

type Params = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function allowed<T extends string>(value: string | undefined, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback;
}
const date = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value?.trim() ?? '') ? value!.trim() : '';

export function parseSalesFilters(params: Params): SalesFilterFormState {
  return {
    range: allowed(single(params.range), ['all', 'today', '7d', '30d', 'custom'] as const, 'all'),
    source: allowed(single(params.source), ['all', 'cafe24', 'seongsu_ticket', 'pos'] as const, 'all'),
    status: allowed(single(params.status), ['all', 'checked', 'pending', 'unavailable', 'not_required'] as const, 'all'),
    sortDirection: single(params.sort) === 'asc' ? 'asc' : 'desc',
    from: date(single(params.from)), to: date(single(params.to)), keyword: (single(params.keyword)?.trim() ?? '').slice(0, 80),
  };
}
