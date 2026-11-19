import { fixtureSchedule } from './fixture-schedule.ts';
import { scheduleInputInstant, type ScheduleOverrides } from './fixture-schedule-storage.ts';

// Compare only the fixed synthetic employees and schedules, including edits moved across months.
export function fixtureScheduleOverlaps(id: string, startInput: string, endInput: string, changes: ScheduleOverrides): boolean {
  const start = scheduleInputInstant(startInput), end = scheduleInputInstant(endInput);
  const employee = id.endsWith('-employee-1') ? 'employee-1' : id.endsWith('-employee-2') ? 'employee-2' : null;
  if (start === null || end === null || end <= start || !employee) return true;
  const candidateStart = start, candidateEnd = end;
  const seen = new Set<string>();
  function overlaps(otherId: string, defaultStart: string, defaultEnd: string) {
    if (otherId === id || seen.has(otherId)) return false;
    seen.add(otherId);
    const override = changes[otherId];
    if (Object.hasOwn(changes, otherId) && override === null) return false;
    const otherStart = scheduleInputInstant(override?.startInput ?? defaultStart);
    const otherEnd = scheduleInputInstant(override?.endInput ?? defaultEnd);
    return otherStart !== null && otherEnd !== null && candidateStart < otherEnd && candidateEnd > otherStart;
  }
  const from = startInput.slice(0, 7), through = endInput.slice(0, 7);
  let year = Number(from.slice(0, 4)), month = Number(from.slice(5));
  while (`${year}-${String(month).padStart(2, '0')}` <= through) {
    const current = `${year}-${String(month).padStart(2, '0')}`;
    for (const item of fixtureSchedule('development', '1', current)) {
      if (item.employee.id !== employee) continue;
      if (overlaps(`${item.date}-${employee}`, `${item.date}T09:00`, `${item.date}T18:00`)) return true;
    }
    if (++month === 13) { month = 1; year++; }
  }
  for (const [otherId, value] of Object.entries(changes)) {
    if (otherId.endsWith(`-${employee}`) && value && overlaps(otherId, value.startInput, value.endInput)) return true;
  }
  return false;
}
