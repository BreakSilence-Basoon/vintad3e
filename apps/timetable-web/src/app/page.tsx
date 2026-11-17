import { Suspense } from 'react';
import { TimetableSlideSwitcher } from '../timetable-slide-switcher';
import { timetableInitialView } from '../view';
import { normalizeMonth } from '../date-time';
import { ScheduleEmptyCalendar } from '../schedule-empty-calendar';

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string | string[]; month?: string | string[] }> }) {
  const { view, month } = await searchParams;
  const initialView = timetableInitialView(view);
  const selectedMonth = normalizeMonth(typeof month === 'string' ? month : undefined);
  return <main className="app-shell timetable-console timetable-home">
    <Suspense fallback={null}>
      <TimetableSlideSwitcher key={initialView} initialSlide={initialView} ariaLabel="출근부와 근무시간표" slides={[
        { key: 'history', label: '출근부', content: <section className="attendance-history-list" aria-label="출근부"><p className="attendance-history-empty">아직 표시할 출퇴근 기록이 없습니다.</p></section> },
        { key: 'schedule', label: '근무시간표', content: <ScheduleEmptyCalendar month={selectedMonth} /> },
      ]} />
    </Suspense>
  </main>;
}
