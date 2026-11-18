import { readTimetable } from './timetable-read.mjs';

const dayMs = 86400000;
const seoulDay = (time) => Math.floor((time + 9 * 3600000) / dayMs);
const dateDay = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / dayMs);

export function historySessionCookie(header) {
  const prefix = '__Host-vintad3e-session=';
  const values = (header ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(prefix));
  if (!values.length) return undefined;
  if (values.length !== 1) return null;
  const value = values[0].slice(prefix.length);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

// A bounded traversal avoids presenting an incomplete result as a complete history.
export async function loadTimetableHistory({ apiOrigin, sessionValue, filters, now }) {
  const records = [];
  const cursors = new Set();
  const ids = new Set();
  let nextCursor;
  for (let page = 0; page < 50; page++) {
    const result = await readTimetable({ apiOrigin, sessionValue, resource: 'history', nextCursor });
    if (result.kind !== 'ready') return { kind: result.kind };
    for (const record of result.data.records) {
      if (ids.has(record.id)) return { kind: 'unavailable' };
      ids.add(record.id); records.push(record);
    }
    nextCursor = result.data.nextCursor;
    if (nextCursor === null) {
      const today = seoulDay(now);
      const filtered = records.filter((item) => {
        const day = seoulDay(Date.parse(item.startsAt));
        if (filters.range === 'today') return day === today;
        if (filters.range === 'last7') return day >= today - 6 && day <= today;
        if (filters.range === 'last30') return day >= today - 29 && day <= today;
        if (filters.range === 'custom') return day >= dateDay(filters.from) && day <= dateDay(filters.to);
        return true;
      }).sort((a, b) => filters.sort === 'asc' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
      return { kind: 'ready', records: filtered };
    }
    if (cursors.has(nextCursor)) return { kind: 'unavailable' };
    cursors.add(nextCursor);
  }
  return { kind: 'unavailable' };
}
