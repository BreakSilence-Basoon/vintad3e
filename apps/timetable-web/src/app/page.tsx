import { Suspense } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { fixtureKioskDevice } from '../fixture-kiosk.mjs';
import { TimetableSlideSwitcher } from '../timetable-slide-switcher';
import { timetableInitialView } from '../view';
import { normalizeMonth } from '../date-time';
import { ScheduleEmptyCalendar } from '../schedule-empty-calendar';
import { AttendanceHistoryFilter } from '../attendance-history-filter';
import { buildHistoryHref, parseHistoryFilters, parseHistoryPage } from '../history-filters';
import { fixtureHistory } from '../fixture-history';
import { FixtureHistoryList } from '../fixture-history-list';
import { FixtureHistoryAdmin } from '../fixture-history-admin-view';
import { FixtureHistorySelf } from '../fixture-history-self';
import { fixtureSelfEnabled } from '../fixture-self';
import { fixtureEmployeeId } from '../fixture-history-admin';
import { linkedEmployees } from '../fixture-linked-attendance';
import { AttendanceHistoryPager } from '../attendance-history-pager';
import { historySessionCookie, loadTimetableHistory } from '../timetable-history-view.mjs';
import { loadTimetableSchedule, scheduleCalendarRange } from '../timetable-schedule-view.mjs';
import { emptyCalendarCells } from '../calendar-cells';
import type { SessionScheduleShift } from '../schedule-empty-calendar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { view } = await searchParams;
  const screen = timetableInitialView(view) === 'schedule' ? '근무시간표' : '출근부';
  return { title: `빈타제 > Timetable > ${screen}` };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { view, month } = params;
  const requestedView = Array.isArray(view) ? view[0] : view;
  const initialView = timetableInitialView(requestedView);
  const selectedMonth = normalizeMonth(typeof month === 'string' ? month : undefined);
  const fixtureEnabled = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_TIMETABLE_FIXTURE === '1';
  if (fixtureEnabled && !process.env.VINTAD3E_TIMETABLE_API_ORIGIN) {
    const origin = fixtureOrigin(process.env);
    if (!origin) notFound();
    const requestHeaders = await headers();
    const host = requestHeaders.get('host'), cookie = requestHeaders.get('cookie');
    if (host !== new URL(origin).host) notFound();
    if (!fixtureSession(cookie, host, process.env)) {
      if (!requestedView && fixtureKioskDevice(cookie, host, process.env)) redirect('/kiosk');
      redirect(`/sign-in?${new URLSearchParams({ next: `/?view=${initialView}` })}`);
    }
  }
  const fixtureAdmin = fixtureEnabled && process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN === '1';
  const fixtureSelf = fixtureSelfEnabled(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN, process.env.VINTAD3E_TIMETABLE_FIXTURE_SELF);
  const parsedFilters = parseHistoryFilters(params);
  const filters = fixtureAdmin ? parsedFilters : { ...parsedFilters, employee: 'all' };
  const now = Date.now();
  let records = fixtureHistory(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, now, filters);
  let failed = false;
  let scheduleFailed = false;
  let scheduleShifts: SessionScheduleShift[] | undefined;
  if (!fixtureEnabled && process.env.VINTAD3E_TIMETABLE_API_ORIGIN && initialView === 'history') {
    const sessionValue = historySessionCookie((await headers()).get('cookie'));
    if (sessionValue === null) failed = true;
    else if (sessionValue !== undefined) {
      const result = await loadTimetableHistory({ apiOrigin: process.env.VINTAD3E_TIMETABLE_API_ORIGIN, sessionValue, filters, now });
      if (result.kind === 'ready' && result.records) records = result.records;
      else failed = true;
    }
  }
  if (!fixtureEnabled && process.env.VINTAD3E_TIMETABLE_API_ORIGIN && initialView === 'schedule') {
    const sessionValue = historySessionCookie((await headers()).get('cookie'));
    if (sessionValue === null) scheduleFailed = true;
    else if (sessionValue !== undefined) {
      try {
        const cells = emptyCalendarCells(selectedMonth);
        const range = scheduleCalendarRange(cells[0].dateKey, cells[cells.length - 1].dateKey);
        const result = await loadTimetableSchedule({ apiOrigin: process.env.VINTAD3E_TIMETABLE_API_ORIGIN, sessionValue, ...range });
        if (result.kind === 'ready' && result.shifts) scheduleShifts = result.shifts;
        else scheduleFailed = true;
      } catch { scheduleFailed = true; }
    }
  }
  const historyPage = parseHistoryPage(params.historyPage);
  const visibleRecords = records.slice(0, historyPage * 10);
  const filterKey = [filters.range, filters.from, filters.to, filters.employee, filters.sort].join(':');
  return <main className="app-shell timetable-console timetable-home">
    <Suspense fallback={null}>
      <TimetableSlideSwitcher key={initialView} initialSlide={initialView} ariaLabel="출근부와 근무시간표" slides={[
        { key: 'history', label: '출근부', content: <section className="attendance-history-list" aria-label="출근부">{failed ? <div className="state-panel" role="alert"><strong>출근부를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해주세요.</p></div> : <><AttendanceHistoryFilter key={filterKey} employees={fixtureAdmin ? [{ id: fixtureEmployeeId, displayName: '직원' }, ...linkedEmployees] : []} filters={filters} isAdmin={fixtureAdmin} pathname="/" persistentParams={{ view: 'history' }} />{fixtureAdmin ? <FixtureHistoryAdmin base={fixtureHistory(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, now, { ...filters, employee: 'all', range: 'all' })} filters={filters} now={now} page={historyPage} /> : fixtureSelf ? <FixtureHistorySelf filters={filters} now={now} page={historyPage} /> : <><FixtureHistoryList records={visibleRecords} /><AttendanceHistoryPager href={buildHistoryHref(filters, historyPage + 1)} totalCount={records.length} visibleCount={visibleRecords.length} /></>}</>}</section> },
        { key: 'schedule', label: '근무시간표', content: scheduleFailed ? <section className="schedule-calendar-page" aria-label="근무시간표"><div className="state-panel" role="alert"><strong>근무시간표를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해주세요.</p></div></section> : <ScheduleEmptyCalendar month={selectedMonth} fixtureEnabled={fixtureEnabled} fixtureAdmin={fixtureAdmin} fixtureSelf={fixtureSelf} sessionShifts={scheduleShifts} /> },
      ]} />
    </Suspense>
  </main>;
}
