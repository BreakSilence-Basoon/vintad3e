'use client';

import { useEffect, useState } from 'react';
import { ScheduleMonthPicker } from './schedule-month-picker';
import { emptyCalendarCells } from './calendar-cells';
import { filterFixtureSchedule, fixtureEmployees, fixtureLocations, fixtureSchedule } from './fixture-schedule';
import { FixtureScheduleDetail } from './fixture-schedule-detail';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
const navigationParams = { view: 'schedule' };

/** The empty-data rendering from Timetable's schedule calendar. */
export function ScheduleEmptyCalendar({ month, fixtureEnabled = false }: { month: string; fixtureEnabled?: boolean }) {
  const [displayMonth, setDisplayMonth] = useState(month);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [location, setLocation] = useState(fixtureEnabled ? fixtureLocations[0].id : '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => { setDisplayMonth(month); }, [month]);

  const cells = emptyCalendarCells(displayMonth);
  const fixtures = fixtureSchedule(fixtureEnabled ? 'development' : undefined, fixtureEnabled ? '1' : undefined, displayMonth);
  const visibleFixtures = filterFixtureSchedule(fixtures, employee, location);
  const selected = fixtures.find(item => item.date === selectedDate);
  return <section className="schedule-calendar-page" aria-label="근무시간표">
    <header className="schedule-calendar-page__toolbar" aria-label="근무시간표 도구">
      <div className="schedule-calendar-page__month">
        <ScheduleMonthPicker onMonthChange={setDisplayMonth} employeeOptions={fixtureEnabled ? fixtureEmployees : []} locationOptions={fixtureEnabled ? fixtureLocations : []}
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
          <ul className="schedule-calendar__shifts">{visibleFixtures.filter(item => item.date === dateKey).map(item => <li key={item.date}><button type="button" className="schedule-calendar__shift schedule-calendar__shift--interactive schedule-calendar__shift--draft" aria-label={`${item.employee.displayName}, ${dateKey.slice(0, 4)}년 ${cellMonth}월 ${day}일 09:00부터 ${dateKey.slice(0, 4)}년 ${cellMonth}월 ${day}일 18:00까지, ${item.location.label}, 근무 상세 보기`} onClick={() => setSelectedDate(dateKey)}><strong>{item.employee.displayName}</strong></button></li>)}</ul>
        </li>;
      })}</ol>
    </div>
    {selected ? <FixtureScheduleDetail date={selected.date} employee={selected.employee.displayName} location={selected.location.label} onClose={() => setSelectedDate(null)} /> : null}
  </section>;
}
