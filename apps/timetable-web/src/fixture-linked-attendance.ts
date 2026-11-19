import { scheduleInputInstant, type ScheduleOverrides } from './fixture-schedule-storage.ts';
import type { HistoryRecord } from './fixture-history-admin.ts';

export const fixtureScheduleChanged = 'vintad3e:timetable-schedule-changed';
export const linkedEmployees = [{ id: '00000000-0000-4000-8000-000000000002', displayName: '직원 01' }, { id: '00000000-0000-4000-8000-000000000003', displayName: '직원 02' }];
export function linkedAttendance(overrides: ScheduleOverrides): HistoryRecord[] {
  return Object.entries(overrides).flatMap(([id, value]) => {
    if (!value?.attendance) return [];
    const number = id.endsWith('-employee-1') ? '1' : id.endsWith('-employee-2') ? '2' : null;
    if (!number) return [];
    const employee = linkedEmployees[Number(number) - 1];
    return [{ id: `schedule:${id}`, startsAt: value.attendance.startsAt, endsAt: value.attendance.endsAt, note: value.note, employeeId: employee.id, employeeName: employee.displayName, shiftStartInput: value.startInput, shiftEndInput: value.endInput }];
  });
}
export function linkedAttendanceWithinWindow(start: string, end: string, startsAt: string, endsAt: string | null): boolean {
  const lower = scheduleInputInstant(start), upper = scheduleInputInstant(end);
  if (lower === null || upper === null || upper <= lower) return false;
  return [startsAt, ...(endsAt ? [endsAt] : [])].every(value => { const timestamp = Date.parse(value); return Number.isFinite(timestamp) && timestamp >= lower - 6 * 3600000 && timestamp <= upper + 12 * 3600000; });
}
