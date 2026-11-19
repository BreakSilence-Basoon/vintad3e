'use client';

import { useEffect, useState } from 'react';
import { ScheduleMonthPicker } from './schedule-month-picker';
import { emptyCalendarCells } from './calendar-cells';
import { filterFixtureSchedule, fixtureEmployees, fixtureLocations } from './fixture-schedule';
import { FixtureScheduleDetail } from './fixture-schedule-detail';
import { FixtureScheduleEditor } from './fixture-schedule-editor';
import { fixtureScheduleEntries } from './fixture-schedule-entries';
import { readScheduleOverrides, writeScheduleOverride, type ScheduleOverride, type ScheduleOverrides } from './fixture-schedule-storage';
import { toSeoulDateTimeInput } from './date-time';
import { fixtureScheduleChanged } from './fixture-linked-attendance';
import { fixtureSelfEmployeeId, selfSchedule } from './fixture-self';

export type SessionScheduleShift = { id: string; location: { id: string; label: string }; startsAt: string; endsAt: string; graceMinutes: number; attendance: { startsAt: string; endsAt: string | null } | null };
type ScheduleEntry = { id: string; date: string; employee: { id: string; displayName: string }; location: { id: string; label: string }; startInput: string; endInput: string; attendance: { startsAt: string; endsAt: string | null } | null };

const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
const navigationParams = { view: 'schedule' };

/** The empty-data rendering from Timetable's schedule calendar. */
export function ScheduleEmptyCalendar({ month, fixtureEnabled = false, fixtureAdmin = false, fixtureSelf = false, sessionShifts }: { month: string; fixtureEnabled?: boolean; fixtureAdmin?: boolean; fixtureSelf?: boolean; sessionShifts?: SessionScheduleShift[] }) {
  const [displayMonth, setDisplayMonth] = useState(month);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [location, setLocation] = useState(fixtureEnabled ? fixtureLocations[0].id : sessionShifts?.[0]?.location.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ScheduleOverrides | null>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const reload = () => { if (fixtureEnabled) { try { setOverrides(readScheduleOverrides(sessionStorage)); } catch { setOverrides(null); } } setLoaded(true); }; reload(); window.addEventListener(fixtureScheduleChanged, reload); return () => window.removeEventListener(fixtureScheduleChanged, reload); }, [fixtureEnabled]);
  useEffect(() => { setDisplayMonth(month); }, [month]);
  useEffect(() => {
    if (!fixtureEnabled && sessionShifts) setLocation(current => sessionShifts.some(item => item.location.id === current) ? current : sessionShifts[0]?.location.id ?? '');
  }, [fixtureEnabled, sessionShifts]);

  const cells = emptyCalendarCells(displayMonth);
  const allFixtures = fixtureEnabled ? fixtureScheduleEntries(displayMonth, overrides ?? {}, cells.map(cell => cell.dateKey)) : [];
  const fixtures = fixtureSelf ? selfSchedule(allFixtures) : allFixtures;
  const fromSession = (sessionShifts ?? []).map(item => ({ ...item, date: toSeoulDateTimeInput(item.startsAt).slice(0, 10), employee: { id: 'self', displayName: '직원' }, startInput: toSeoulDateTimeInput(item.startsAt), endInput: toSeoulDateTimeInput(item.endsAt) }));
  const shifts: ScheduleEntry[] = fixtureEnabled ? fixtures : fromSession;
  const locations = fixtureEnabled ? (fixtureSelf ? fixtureLocations.slice(0, 1) : fixtureLocations) : [...new Map(fromSession.map(item => [item.location.id, item.location])).values()];
  const employees = fixtureEnabled ? (fixtureSelf ? fixtureEmployees.filter(employee => employee.id === fixtureSelfEmployeeId) : fixtureEmployees) : [];
  const visibleShifts = filterFixtureSchedule(shifts, employee, location);
  const selected = shifts.find(item => item.id === selectedId);
  const selectedFixture = fixtures.find(item => item.id === selectedId);
  function saveFixture(value: ScheduleOverride) {
    if (!selectedFixture || overrides === null) return false;
    try { const saved = writeScheduleOverride(sessionStorage, selectedFixture.id, value); if (!saved) return false; setOverrides(saved); window.dispatchEvent(new Event(fixtureScheduleChanged)); return true; } catch { return false; }
  }
  if (fixtureSelf && loaded && overrides === null) return <section className="schedule-calendar-page" aria-label="근무시간표"><div className="state-panel" role="alert"><strong>근무시간표를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해주세요.</p></div></section>;
  return <section className="schedule-calendar-page" aria-label="근무시간표">
    <header className="schedule-calendar-page__toolbar" aria-label="근무시간표 도구">
      <div className="schedule-calendar-page__month">
        <ScheduleMonthPicker onMonthChange={setDisplayMonth} employeeOptions={employees} locationOptions={locations}
          month={displayMonth} pathname="/" persistentParams={navigationParams} onOpenChange={setIsMonthPickerOpen}
          onSelectedEmployeeIdChange={setEmployee} onSelectedLocationIdChange={setLocation}
          selectedEmployeeId={employee} selectedLocationId={location} />
      </div>
    </header>
    <p className="sr-only" id="schedule-copy-instructions">
      컨트롤 키를 누른 채 근무를 다른 날짜로 끌면 원본을 남기고 복사합니다.
      모바일에서는 근무를 길게 누른 뒤 다른 날짜로 끌거나 날짜를 선택해 복사합니다.
    </p>
    <p className="sr-only" aria-live="polite" role="status" />
    <div className={`schedule-calendar${isMonthPickerOpen ? ' schedule-calendar--picker-open' : ''}${displayMonth !== month ? ' schedule-calendar--month-pending' : ''}`}
      data-calendar-month={displayMonth} data-copy-mode="idle" aria-busy={displayMonth !== month || undefined}>
      <div className="schedule-calendar__weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
      <ol className="schedule-calendar__days">{cells.map(({ dateKey, cellMonth, day, weekday, outside }) => {
        return <li className={`schedule-calendar__day${outside ? ' schedule-calendar__day--outside' : ''}`} data-schedule-date={dateKey} key={dateKey}>
          <time dateTime={dateKey}><span className="schedule-calendar__day-number">{day}</span><span className="schedule-calendar__day-label">{cellMonth}월 {day}일 {weekday}요일</span></time>
          <ul className="schedule-calendar__shifts">{visibleShifts.filter(item => item.date === dateKey).map(item => {
            const [endYear, endMonth, endDay] = item.endInput.slice(0, 10).split('-');
            const state = item.attendance?.endsAt ? 'checked-out' : item.attendance?.startsAt ? 'checked-in' : 'draft';
            return <li key={item.id}><button type="button" data-hydrated={loaded} className={`schedule-calendar__shift schedule-calendar__shift--interactive schedule-calendar__shift--${state}`} aria-label={`${item.employee.displayName}, ${dateKey.slice(0, 4)}년 ${cellMonth}월 ${day}일 ${item.startInput.slice(11, 16)}부터 ${endYear}년 ${Number(endMonth)}월 ${Number(endDay)}일 ${item.endInput.slice(11, 16)}까지, ${item.location.label}, 근무 상세 보기`} onClick={() => setSelectedId(item.id)}><strong>{item.employee.displayName}</strong></button></li>;
          })}</ul>
        </li>;
      })}</ol>
    </div>
    {selectedFixture && fixtureAdmin && loaded ? <FixtureScheduleEditor key={selectedFixture.id} shift={selectedFixture} changes={overrides ?? {}} onSave={saveFixture} onClose={() => setSelectedId(null)} /> : selected ? <FixtureScheduleDetail date={selected.date} employee={selected.employee.displayName} location={selected.location.label} startInput={selected.startInput} endInput={selected.endInput} attendance={selected.attendance} note={selectedFixture?.note} onClose={() => setSelectedId(null)} /> : null}
  </section>;
}
