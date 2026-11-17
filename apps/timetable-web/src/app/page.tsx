import { Suspense } from 'react';
import { TimetableSlideSwitcher } from '../timetable-slide-switcher';
import { timetableInitialView } from '../view';
import { normalizeMonth } from '../date-time';
import { ScheduleEmptyCalendar } from '../schedule-empty-calendar';
import { AttendanceHistoryFilter } from '../attendance-history-filter';
import { parseHistoryFilters } from '../history-filters';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { view, month } = params;
  const initialView = timetableInitialView(view);
  const selectedMonth = normalizeMonth(typeof month === 'string' ? month : undefined);
  const filters = parseHistoryFilters(params);
  const filterKey = [filters.range, filters.from, filters.to, filters.employee, filters.sort].join(':');
  return <main className="app-shell timetable-console timetable-home">
    <Suspense fallback={null}>
      <TimetableSlideSwitcher key={initialView} initialSlide={initialView} ariaLabel="출근부와 근무시간표" slides={[
        { key: 'history', label: '출근부', content: <section className="attendance-history-list" aria-label="출근부"><AttendanceHistoryFilter key={filterKey} employees={[]} filters={filters} isAdmin={false} pathname="/" persistentParams={{ view: 'history' }} /><p className="attendance-history-empty">아직 표시할 출퇴근 기록이 없습니다.</p></section> },
        { key: 'schedule', label: '근무시간표', content: <ScheduleEmptyCalendar month={selectedMonth} /> },
      ]} />
    </Suspense>
  </main>;
}
