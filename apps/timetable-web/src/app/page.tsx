import { Suspense } from 'react';
import { headers } from 'next/headers';
import { TimetableSlideSwitcher } from '../timetable-slide-switcher';
import { timetableInitialView } from '../view';
import { normalizeMonth } from '../date-time';
import { ScheduleEmptyCalendar } from '../schedule-empty-calendar';
import { AttendanceHistoryFilter } from '../attendance-history-filter';
import { buildHistoryHref, parseHistoryFilters, parseHistoryPage } from '../history-filters';
import { fixtureHistory } from '../fixture-history';
import { FixtureHistoryList } from '../fixture-history-list';
import { AttendanceHistoryPager } from '../attendance-history-pager';
import { historySessionCookie, loadTimetableHistory } from '../timetable-history-view.mjs';

export const dynamic = 'force-dynamic';

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
  const filters = { ...parseHistoryFilters(params), employee: 'all' };
  const now = Date.now();
  const fixtureEnabled = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_TIMETABLE_FIXTURE === '1';
  let records = fixtureHistory(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, now, filters);
  let failed = false;
  if (!fixtureEnabled && process.env.VINTAD3E_TIMETABLE_API_ORIGIN && initialView === 'history') {
    const sessionValue = historySessionCookie((await headers()).get('cookie'));
    if (sessionValue === null) failed = true;
    else if (sessionValue !== undefined) {
      const result = await loadTimetableHistory({ apiOrigin: process.env.VINTAD3E_TIMETABLE_API_ORIGIN, sessionValue, filters, now });
      if (result.kind === 'ready' && result.records) records = result.records;
      else failed = true;
    }
  }
  const historyPage = parseHistoryPage(params.historyPage);
  const visibleRecords = records.slice(0, historyPage * 10);
  const filterKey = [filters.range, filters.from, filters.to, filters.employee, filters.sort].join(':');
  return <main className="app-shell timetable-console timetable-home">
    <Suspense fallback={null}>
      <TimetableSlideSwitcher key={initialView} initialSlide={initialView} ariaLabel="출근부와 근무시간표" slides={[
        { key: 'history', label: '출근부', content: <section className="attendance-history-list" aria-label="출근부">{failed ? <div className="state-panel" role="alert"><strong>출근부를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해주세요.</p></div> : <><AttendanceHistoryFilter key={filterKey} employees={[]} filters={filters} isAdmin={false} pathname="/" persistentParams={{ view: 'history' }} /><FixtureHistoryList records={visibleRecords} /><AttendanceHistoryPager href={buildHistoryHref(filters, historyPage + 1)} totalCount={records.length} visibleCount={visibleRecords.length} /></>}</section> },
        { key: 'schedule', label: '근무시간표', content: <ScheduleEmptyCalendar month={selectedMonth} fixtureEnabled={fixtureEnabled} /> },
      ]} />
    </Suspense>
  </main>;
}
