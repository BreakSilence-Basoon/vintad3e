import { Suspense } from 'react';
import { TimetableSlideSwitcher } from '../timetable-slide-switcher';
import { timetableInitialView } from '../view';
import { normalizeMonth } from '../date-time';
import { ScheduleEmptyCalendar } from '../schedule-empty-calendar';
import { AttendanceHistoryFilter } from '../attendance-history-filter';
import { parseHistoryFilters } from '../history-filters';
import { fixtureHistory } from '../fixture-history';
import { FixtureHistoryList } from '../fixture-history-list';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { view } = await searchParams;
  const screen = timetableInitialView(view) === 'schedule' ? '근무시간표' : '출근부';
  return { title: `침깨 > Timetable > ${screen}` };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { view, month } = params;
  const initialView = timetableInitialView(view);
  const selectedMonth = normalizeMonth(typeof month === 'string' ? month : undefined);
  const filters = parseHistoryFilters(params);
  const records = fixtureHistory(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, Date.now(), filters);
  const filterKey = [filters.range, filters.from, filters.to, filters.employee, filters.sort].join(':');
  return <main className="app-shell timetable-console timetable-home">
    <Suspense fallback={null}>
      <TimetableSlideSwitcher key={initialView} initialSlide={initialView} ariaLabel="출근부와 근무시간표" slides={[
        { key: 'history', label: '출근부', content: <section className="attendance-history-list" aria-label="출근부"><AttendanceHistoryFilter key={filterKey} employees={[]} filters={filters} isAdmin={false} pathname="/" persistentParams={{ view: 'history' }} /><FixtureHistoryList records={records} /></section> },
        { key: 'schedule', label: '근무시간표', content: <ScheduleEmptyCalendar month={selectedMonth} fixtureEnabled={process.env.NODE_ENV === 'development' && process.env.VINTAD3E_TIMETABLE_FIXTURE === '1'} /> },
      ]} />
    </Suspense>
  </main>;
}
