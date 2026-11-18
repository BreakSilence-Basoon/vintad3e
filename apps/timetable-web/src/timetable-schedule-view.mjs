import { readTimetable } from './timetable-read.mjs';

export function scheduleCalendarRange(firstDay, lastDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDay) || !/^\d{4}-\d{2}-\d{2}$/.test(lastDay)) throw new Error('Invalid calendar range');
  const first = Date.parse(`${firstDay}T00:00:00+09:00`);
  const last = Date.parse(`${lastDay}T00:00:00+09:00`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || new Date(first + 9 * 3600000).toISOString().slice(0, 10) !== firstDay || new Date(last + 9 * 3600000).toISOString().slice(0, 10) !== lastDay || last < first || last - first >= 62 * 86400000) throw new Error('Invalid calendar range');
  return { from: new Date(first).toISOString(), to: new Date(last + 86400000).toISOString() };
}

export async function loadTimetableSchedule({ apiOrigin, sessionValue, from, to }) {
  const shifts = [];
  const ids = new Set(), cursors = new Set();
  const locations = new Map();
  let nextCursor;
  for (let page = 0; page < 50; page++) {
    const result = await readTimetable({ apiOrigin, sessionValue, resource: 'shifts', from, to, nextCursor, includeAttendance: true });
    if (result.kind !== 'ready') return { kind: result.kind };
    for (const shift of result.data.shifts) {
      if (ids.has(shift.id)) return { kind: 'unavailable' };
      if (locations.has(shift.location.id) && locations.get(shift.location.id) !== shift.location.label) return { kind: 'unavailable' };
      locations.set(shift.location.id, shift.location.label);
      ids.add(shift.id); shifts.push(shift);
    }
    nextCursor = result.data.nextCursor;
    if (nextCursor === null) return { kind: 'ready', shifts: shifts.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)) };
    if (cursors.has(nextCursor)) return { kind: 'unavailable' };
    cursors.add(nextCursor);
  }
  return { kind: 'unavailable' };
}
