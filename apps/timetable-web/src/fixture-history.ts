import type { AttendanceHistoryFilters } from './attendance-history-filter';

type Fixture = { id: string; startsAt: string; endsAt: string };
const dayMs = 86400000;
const seoulDay = (time: number) => Math.floor((time + 9 * 3600000) / dayMs);
const dateDay = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / dayMs);

export function fixtureHistory(env: string | undefined, enabled: string | undefined, now: number, filters: AttendanceHistoryFilters): Fixture[] {
  if (env !== 'development' || enabled !== '1' || filters.employee !== 'all') return [];
  const today = seoulDay(now);
  const fixtures = [0, 1].map((offset) => {
    const start = (today - offset) * dayMs; // 09:00 Seoul
    return { id: String(offset), startsAt: new Date(start).toISOString(), endsAt: new Date(start + 8 * 3600000).toISOString() };
  });
  return fixtures.filter((item) => {
    const day = seoulDay(Date.parse(item.startsAt));
    if (filters.range === 'today') return day === today;
    if (filters.range === 'last7') return day >= today - 6 && day <= today;
    if (filters.range === 'last30') return day >= today - 29 && day <= today;
    if (filters.range === 'custom') return day >= dateDay(filters.from) && day <= dateDay(filters.to);
    return true;
  }).sort((a, b) => filters.sort === 'asc' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));
}
