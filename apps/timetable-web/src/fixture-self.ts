import { linkedAttendance, linkedEmployees } from './fixture-linked-attendance.ts';
import { selectHistory } from './fixture-history-admin.ts';
import type { AttendanceHistoryFilters } from './attendance-history-filter.tsx';
import type { ScheduleOverrides } from './fixture-schedule-storage.ts';

// This identity exists only in the development fixture, not in the real authentication system.
export const fixtureSelfEmployeeId = 'employee-1';
export function fixtureSelfEnabled(env: string | undefined, fixture: string | undefined, admin: string | undefined, self: string | undefined): boolean {
  return env === 'development' && fixture === '1' && admin !== '1' && self === '1';
}
export function selfSchedule<T extends { employee: { id: string } }>(rows: T[]): T[] {
  return rows.filter(row => row.employee.id === fixtureSelfEmployeeId);
}
export function selfAttendance(overrides: ScheduleOverrides, filters: AttendanceHistoryFilters, now: number) {
  return selectHistory(linkedAttendance(overrides), {}, { ...filters, employee: linkedEmployees[0].id }, now);
}
