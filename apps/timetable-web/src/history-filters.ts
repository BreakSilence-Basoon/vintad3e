import type { AttendanceHistoryFilters, AttendanceHistoryRange } from './attendance-history-filter';

type SearchParams = Record<string, string | string[] | undefined>;
const validRanges: AttendanceHistoryRange[] = ['all', 'today', 'last7', 'last30', 'custom'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Same selection rules as the original attendance panel; this does not read records.
export function parseHistoryFilters(params: SearchParams): AttendanceHistoryFilters {
  const rawRange = first(params.range) ?? '', rawFrom = first(params.from) ?? '', rawTo = first(params.to) ?? '', rawEmployee = first(params.employee) ?? '';
  let range = validRanges.includes(rawRange as AttendanceHistoryRange) ? rawRange as AttendanceHistoryRange : 'all';
  let from = isDate(rawFrom) ? rawFrom : '', to = isDate(rawTo) ? rawTo : '';
  if (!rawRange) range = 'last7';
  if (range === 'custom' && (!from || !to || from > to)) { range = 'all'; from = ''; to = ''; }
  return { employee: uuidPattern.test(rawEmployee) ? rawEmployee : 'all', from, range,
    sort: first(params.sort) === 'asc' ? 'asc' : 'desc', to };
}

export function parseHistoryPage(value: string | string[] | undefined) {
  const text = first(value);
  if (typeof text !== 'string' || !/^\d+$/.test(text)) return 1;
  const page = Number(text);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1;
}

export function buildHistoryHref(filters: AttendanceHistoryFilters, historyPage: number, includeEmployee = false) {
  const params = new URLSearchParams({ view: 'history', range: filters.range });
  if (filters.range === 'custom') { params.set('from', filters.from); params.set('to', filters.to); }
  if (includeEmployee && filters.employee !== 'all') params.set('employee', filters.employee);
  if (filters.sort !== 'desc') params.set('sort', filters.sort);
  if (historyPage > 1) params.set('historyPage', String(historyPage));
  return `/?${params.toString()}`;
}
