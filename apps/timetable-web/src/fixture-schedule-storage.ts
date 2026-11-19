export type ScheduleAttendance = { startsAt: string; endsAt: string | null };
export type ScheduleOverride = { startInput: string; endInput: string; note: string; attendance: ScheduleAttendance | null } | null;
export type ScheduleOverrides = Record<string, ScheduleOverride>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const slot = 'vintad3e:timetable-schedule';
const idPattern = /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:08-employee-1|18-employee-2)$/;
const inputPattern = /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d$/;
function inputInstant(value: unknown): number | null {
  if (typeof value !== 'string' || !inputPattern.test(value)) return null;
  const parsed = Date.parse(`${value}:00+09:00`);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + 9 * 3600000).toISOString().slice(0, 16) === value ? parsed : null;
}
function instant(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function validScheduleOverride(value: unknown): value is Exclude<ScheduleOverride, null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).sort().join(',') !== 'attendance,endInput,note,startInput') return false;
  const start = inputInstant(item.startInput), end = inputInstant(item.endInput);
  if (start === null || end === null || end <= start || typeof item.note !== 'string' || !item.note.trim() || Array.from(item.note).length > 500) return false;
  if (item.attendance === null) return true;
  if (!item.attendance || typeof item.attendance !== 'object' || Array.isArray(item.attendance)) return false;
  const attendance = item.attendance as Record<string, unknown>;
  if (Object.keys(attendance).sort().join(',') !== 'endsAt,startsAt') return false;
  return instant(attendance.startsAt) && (attendance.endsAt === null || instant(attendance.endsAt) && attendance.endsAt > attendance.startsAt);
}
export function readScheduleOverrides(store: Store): ScheduleOverrides | null {
  try {
    const raw = store.getItem(slot); if (raw === null) return {};
    if (raw.length > 64000) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    if (entries.length > 100 || entries.some(([id, value]) => !idPattern.test(id) || value !== null && !validScheduleOverride(value))) return null;
    return Object.fromEntries(entries) as ScheduleOverrides;
  } catch { return null; }
}
export function writeScheduleOverride(store: Store, id: string, value: ScheduleOverride): ScheduleOverrides | null {
  if (!idPattern.test(id) || value !== null && !validScheduleOverride(value)) return null;
  const current = readScheduleOverrides(store);
  if (!current || !Object.hasOwn(current, id) && Object.keys(current).length >= 100) return null;
  const next = { ...current, [id]: value };
  try { const encoded = JSON.stringify(next); if (encoded.length > 64000) return null; store.setItem(slot, encoded); return next; } catch { return null; }
}
export function scheduleInputInstant(value: string): number | null { return inputInstant(value); }
