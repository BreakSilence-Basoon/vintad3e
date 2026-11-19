import type { AttendanceHistoryFilters } from './attendance-history-filter';
import type { fixtureHistory } from './fixture-history';

export const fixtureEmployeeId = '00000000-0000-4000-8000-000000000001';
export type HistoryRecord = ReturnType<typeof fixtureHistory>[number] & { note?: string; employeeId?: string; employeeName?: string; shiftStartInput?: string; shiftEndInput?: string };
type Edit = { startsAt: string; endsAt: string | null; note: string } | null;
export type HistoryEdits = Record<string, Edit>;
const dayMs = 86400000;
const seoulDay = (time: number) => Math.floor((time + 9 * 3600000) / dayMs);
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function parseHistoryEdits(raw: string, day: number): HistoryEdits {
  if (raw.length > 32000) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const parsed = data as { day?: unknown; edits?: unknown };
    if (parsed.day !== day || !parsed.edits || typeof parsed.edits !== 'object' || Array.isArray(parsed.edits)) return {};
    const result: HistoryEdits = {};
    for (const [id, item] of Object.entries(parsed.edits)) {
      if (!/^(?:[0-9]|1[0-9]|20)$/.test(id)) continue;
      if (item === null) { result[id] = null; continue; }
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const entry = item as { startsAt?: unknown; endsAt?: unknown; note?: unknown };
      if (!instant(entry.startsAt) || !(entry.endsAt === null || instant(entry.endsAt) && entry.endsAt > entry.startsAt) || typeof entry.note !== 'string' || !entry.note.trim() || Array.from(entry.note).length > 500) continue;
      result[id] = { startsAt: entry.startsAt, endsAt: entry.endsAt, note: entry.note };
    }
    return result;
  } catch { return {}; }
}
export function selectHistory(base: HistoryRecord[], edits: HistoryEdits, filters: AttendanceHistoryFilters, now: number): HistoryRecord[] {
  const today = seoulDay(now);
  return base.flatMap(record => Object.hasOwn(edits, record.id) ? edits[record.id] === null ? [] : [{ ...record, ...edits[record.id]! }] : [record]).filter(record => {
    if (filters.employee !== 'all' && filters.employee !== (record.employeeId ?? fixtureEmployeeId)) return false;
    const day = seoulDay(Date.parse(record.startsAt));
    if (filters.range === 'today') return day === today;
    if (filters.range === 'last7') return day >= today - 6 && day <= today;
    if (filters.range === 'last30') return day >= today - 29 && day <= today;
    if (filters.range === 'custom') return day >= Math.floor(Date.parse(`${filters.from}T00:00:00Z`) / dayMs) && day <= Math.floor(Date.parse(`${filters.to}T00:00:00Z`) / dayMs);
    return true;
  }).sort((a, b) => filters.sort === 'asc' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
}
export const fixtureHistoryDay = (now: number) => seoulDay(now);

// The fixture shift is 09:00–17:00 Seoul; the original permits six hours early and twelve hours late.
export function historyWithinShiftWindow(originalStart: string, startsAt: string, endsAt: string | null): boolean {
  if (!instant(originalStart) || !instant(startsAt) || endsAt !== null && !instant(endsAt)) return false;
  const shiftStart = seoulDay(Date.parse(originalStart)) * dayMs;
  const lower = shiftStart - 6 * 3600000, upper = shiftStart + 20 * 3600000;
  return [startsAt, ...(endsAt ? [endsAt] : [])].every(value => Date.parse(value) >= lower && Date.parse(value) <= upper);
}

export function historyNotInFuture(startsAt: string, endsAt: string | null, now: number): boolean {
  return instant(startsAt) && (endsAt === null || instant(endsAt)) && Number.isFinite(now) && Date.parse(startsAt) <= now && (endsAt === null || Date.parse(endsAt) <= now);
}
