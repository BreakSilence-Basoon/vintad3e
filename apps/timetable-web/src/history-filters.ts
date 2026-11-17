import type { AttendanceHistoryFilters, AttendanceHistoryRange } from './attendance-history-filter';

type SearchParams = Record<string, string | string[] | undefined>;
const validRanges: AttendanceHistoryRange[] = ['all', 'today', 'last7', 'last30', 'custom'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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
