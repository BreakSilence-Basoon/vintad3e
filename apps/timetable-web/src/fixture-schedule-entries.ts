import { fixtureEmployees, fixtureLocations, fixtureSchedule } from './fixture-schedule.ts';
import type { ScheduleAttendance, ScheduleOverride, ScheduleOverrides } from './fixture-schedule-storage.ts';

export type FixtureScheduleEntry = { id: string; date: string; employee: typeof fixtureEmployees[number]; location: typeof fixtureLocations[number]; startInput: string; endInput: string; note: string; attendance: ScheduleAttendance | null };
function original(date: string, index: number): FixtureScheduleEntry {
  const employee = fixtureEmployees[index], location = fixtureLocations[index];
  return { id: `${date}-${employee.id}`, date, employee, location, startInput: `${date}T09:00`, endInput: `${date}T18:00`, note: '', attendance: null };
}
function apply(base: FixtureScheduleEntry, override: ScheduleOverride): FixtureScheduleEntry | null {
  return override === null ? null : { ...base, ...override, date: override.startInput.slice(0, 10) };
}
export function fixtureScheduleEntries(month: string, overrides: ScheduleOverrides, visibleDates: readonly string[]): FixtureScheduleEntry[] {
  const visible = new Set(visibleDates), entries: FixtureScheduleEntry[] = [];
  const base = fixtureSchedule('development', '1', month).map(item => original(item.date, fixtureEmployees.findIndex(employee => employee.id === item.employee.id)));
  for (const row of base) {
    const value = Object.hasOwn(overrides, row.id) ? apply(row, overrides[row.id]) : row;
    if (value && visible.has(value.date)) entries.push(value);
  }
  for (const [id, value] of Object.entries(overrides)) {
    if (id.slice(0, 7) === month || value === null || !visible.has(value.startInput.slice(0, 10))) continue;
    const match = /^((?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:08|18))-(employee-[12])$/.exec(id);
    if (!match) continue;
    const index = fixtureEmployees.findIndex(employee => employee.id === match[2]);
    if (index < 0 || index === 0 && !match[1].endsWith('-08') || index === 1 && !match[1].endsWith('-18')) continue;
    const row = apply(original(match[1], index), value);
    if (row) entries.push(row);
  }
  return entries;
}
