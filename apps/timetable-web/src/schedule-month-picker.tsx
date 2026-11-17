'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { currentSeoulMonth, shiftMonth } from './date-time';

type CalendarMode = 'days' | 'months' | 'years';
type FocusTarget = 'current' | 'next' | 'previous' | 'today';

const monthLabels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function getMonthYear(month: string) {
  return Number(month.slice(0, 4));
}

function getMonthNumber(month: string) {
  return Number(month.slice(5, 7));
}

function formatMonth(year: number, monthNumber: number) {
  return `${year}-${String(monthNumber).padStart(2, '0')}`;
}

function getYearRangeStart(year: number) {
  return Math.floor((year - 2020) / 12) * 12 + 2020;
}

function ChevronIcon({ direction }: { direction: 'down' | 'next' | 'prev' | 'up' }) {
  const path =
    direction === 'prev'
      ? 'm15 18-6-6 6-6'
      : direction === 'next'
        ? 'm9 18 6-6-6-6'
        : direction === 'up'
          ? 'm6 15 6-6 6 6'
          : 'm6 9 6 6 6-6';

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

export function ScheduleMonthPicker({
  employeeOptions,
  locationOptions,
  month,
  onMonthChange,
  onOpenChange,
  onSelectedEmployeeIdChange,
  onSelectedLocationIdChange,
  pathname,
  persistentParams = {},
  selectedEmployeeId,
  selectedLocationId,
}: {
  employeeOptions: Array<{ displayName: string; id: string }>;
  locationOptions: Array<{ id: string; label: string }>;
  month: string;
  onMonthChange?: (month: string) => void;
  onOpenChange?: (open: boolean) => void;
  onSelectedEmployeeIdChange: (employeeId: string) => void;
  onSelectedLocationIdChange: (locationId: string) => void;
  pathname: string;
  persistentParams?: Record<string, string>;
  selectedEmployeeId: string;
  selectedLocationId: string;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const panelId = useId();
  const currentButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const previousButtonRef = useRef<HTMLButtonElement>(null);
  const todayButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastMonthRef = useRef(month);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const pendingMonthFocusRef = useRef<number | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('days');
  const [pickerYear, setPickerYear] = useState(() => getMonthYear(month));
  const selectedYear = getMonthYear(month);
  const selectedMonthNumber = getMonthNumber(month);
  const todayMonth = currentSeoulMonth();
  const todayYear = getMonthYear(todayMonth);
  const todayMonthNumber = getMonthNumber(todayMonth);
  const yearRangeStart = getYearRangeStart(pickerYear);
  const years = Array.from(
    { length: 12 },
    (_, index) => yearRangeStart + index,
  );
  const toolbarLabel =
    calendarMode === 'years'
      ? `${yearRangeStart}–${yearRangeStart + 11}`
      : calendarMode === 'months'
        ? `${pickerYear}년`
        : month.replace('-', '.');
  const currentButtonLabel =
    calendarMode === 'years'
      ? '월 선택으로 돌아가기'
      : calendarMode === 'months'
        ? `${pickerYear}년 연도 선택 열기`
        : `${selectedYear}년 ${selectedMonthNumber}월 선택 열기`;

  const focusControl = useCallback((target: FocusTarget) => {
    const targets = {
      current: currentButtonRef,
      next: nextButtonRef,
      previous: previousButtonRef,
      today: todayButtonRef,
    };
    targets[target].current?.focus();
  }, []);

  function navigate(targetMonth: string, focusTarget: FocusTarget) {
    setCalendarMode('days');
    onOpenChange?.(false);
    pendingFocusRef.current = focusTarget;

    if (targetMonth === month) {
      pendingFocusRef.current = null;
      requestAnimationFrame(() => focusControl(focusTarget));
      return;
    }

    // 보이는 달을 먼저 바꾼다. 서버 응답을 기다리면 연달아 누를 때 두 번째
    // 클릭이 아직 안 바뀐 달을 기준으로 계산돼 같은 달로 다시 가버린다.
    onMonthChange?.(targetMonth);

    // transition 안에서 옮기면 새 달을 받아오는 동안 보던 일정이 그대로 남는다.
    startNavigation(() => {
      router.push(monthHref(targetMonth), { scroll: false });
    });
  }

  function monthHref(targetMonth: string) {
    const params = new URLSearchParams(persistentParams);
    params.set('month', targetMonth);

    return `${pathname}?${params.toString()}`;
  }

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    // 사람은 대개 바로 앞뒤 달로 간다. 미리 받아두면 누르는 순간 이미 손에 있어
    // 기다리지 않는다. 라우터 캐시가 30초 들고 있으므로 오갈 때도 즉시 바뀐다.
    // 연달아 누르는 사람을 위해 두 칸 앞뒤까지 받아둔다.
    for (const offset of [-2, -1, 1, 2]) {
      router.prefetch(monthHref(shiftMonth(month, offset)));
    }
    // monthHref는 pathname·persistentParams만 읽으므로 아래 목록이면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, month, pathname, persistentParams, router]);

  function stepCalendar(offset: number, focusTarget: FocusTarget) {
    if (calendarMode === 'years') {
      setPickerYear((current) => current + offset * 12);
      return;
    }

    if (calendarMode === 'months') {
      setPickerYear((current) => current + offset);
      return;
    }

    navigate(shiftMonth(month, offset), focusTarget);
  }

  function togglePicker() {
    if (calendarMode === 'days') {
      setPickerYear(selectedYear);
      setCalendarMode('months');
      onOpenChange?.(true);
      return;
    }

    setCalendarMode(calendarMode === 'months' ? 'years' : 'months');
    onOpenChange?.(true);
  }

  const previousStepLabel =
    calendarMode === 'years'
      ? '이전 12년 범위로 이동'
      : calendarMode === 'months'
        ? '이전 연도로 이동'
        : '이전 달로 이동';
  const nextStepLabel =
    calendarMode === 'years'
      ? '다음 12년 범위로 이동'
      : calendarMode === 'months'
        ? '다음 연도로 이동'
        : '다음 달로 이동';

  useEffect(() => {
    if (lastMonthRef.current === month) {
      return;
    }

    lastMonthRef.current = month;
    const focusTarget = pendingFocusRef.current;
    pendingFocusRef.current = null;
    requestAnimationFrame(() => focusControl(focusTarget ?? 'current'));
  }, [focusControl, month]);

  useEffect(() => {
    if (calendarMode !== 'months' || pendingMonthFocusRef.current === null) {
      return;
    }

    const monthIndex = pendingMonthFocusRef.current;
    pendingMonthFocusRef.current = null;
    requestAnimationFrame(() => monthButtonRefs.current[monthIndex]?.focus());
  }, [calendarMode, pickerYear]);

  function closePicker() {
    setCalendarMode('days');
    onOpenChange?.(false);
    requestAnimationFrame(() => currentButtonRef.current?.focus());
  }

  return (
    <div
      className="schedule-month-picker"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && calendarMode !== 'days') {
          event.preventDefault();
          closePicker();
        }
      }}
    >
      <span className="sr-only" aria-live="polite">
        {selectedYear}년 {selectedMonthNumber}월 달력
      </span>
      <div className="schedule-month-picker__controls">
        <div
          className="schedule-month-picker__navigation"
          aria-busy={isNavigating || undefined}
          aria-label="달력 이동"
        >
          <button
            className="schedule-month-picker__step"
            type="button"
            disabled={!isHydrated}
            ref={previousButtonRef}
            aria-label={previousStepLabel}
            onClick={() => stepCalendar(-1, 'previous')}
          >
            <ChevronIcon direction="prev" />
          </button>
          <button
            className="schedule-month-picker__current"
            type="button"
            disabled={!isHydrated}
            ref={currentButtonRef}
            aria-controls={panelId}
            aria-expanded={calendarMode !== 'days'}
            aria-label={currentButtonLabel}
            onClick={togglePicker}
          >
            <strong>{toolbarLabel}</strong>
            <span aria-hidden="true">
              <ChevronIcon direction={calendarMode === 'years' ? 'up' : 'down'} />
            </span>
          </button>
          <button
            className="schedule-month-picker__step"
            type="button"
            disabled={!isHydrated}
            ref={nextButtonRef}
            aria-label={nextStepLabel}
            onClick={() => stepCalendar(1, 'next')}
          >
            <ChevronIcon direction="next" />
          </button>
        </div>
        <div className="schedule-month-picker__filters">
          <button
            className="schedule-month-picker__today"
            type="button"
            disabled={!isHydrated}
            ref={todayButtonRef}
            onClick={() => navigate(todayMonth, 'today')}
          >
            오늘
          </button>
          <label className="schedule-month-picker__employee-filter">
            <span className="sr-only">직원별 일정</span>
            <select
              aria-label="직원별 일정"
              disabled={!isHydrated}
              value={selectedEmployeeId}
              onChange={(event) =>
                onSelectedEmployeeIdChange(event.currentTarget.value)
              }
            >
              <option value="">직원</option>
              {employeeOptions.map((employee) => (
                <option value={employee.id} key={employee.id}>
                  {employee.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="schedule-month-picker__location-filter">
            <span className="sr-only">장소별 일정</span>
            <select
              aria-label="장소별 일정"
              disabled={!isHydrated}
              value={selectedLocationId}
              onChange={(event) =>
                onSelectedLocationIdChange(event.currentTarget.value)
              }
            >
              <option value="" disabled>
                장소
              </option>
              {locationOptions.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {calendarMode === 'months' ? (
        <div className="schedule-month-picker__panel" id={panelId}>
          <div
            className="schedule-month-picker__grid schedule-month-picker__grid--months"
            role="group"
            aria-label={`${pickerYear}년 월 선택`}
          >
            {monthLabels.map((label, index) => {
              const monthNumber = index + 1;
              const isSelected =
                pickerYear === selectedYear &&
                monthNumber === selectedMonthNumber;
              const isToday =
                pickerYear === todayYear && monthNumber === todayMonthNumber;

              return (
                <button
                  className={`schedule-month-picker__option${isToday ? ' is-today' : ''}`}
                  type="button"
                  disabled={!isHydrated}
                  key={label}
                  ref={(button) => {
                    monthButtonRefs.current[index] = button;
                  }}
                  aria-current={isSelected ? 'date' : undefined}
                  onClick={() =>
                    navigate(formatMonth(pickerYear, monthNumber), 'current')
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {calendarMode === 'years' ? (
        <div className="schedule-month-picker__panel" id={panelId}>
          <div
            className="schedule-month-picker__grid schedule-month-picker__grid--years"
            role="group"
            aria-label="연도 선택"
          >
            {years.map((year) => (
              <button
                className={`schedule-month-picker__option${year === todayYear ? ' is-today' : ''}`}
                type="button"
                disabled={!isHydrated}
                key={year}
                aria-current={year === selectedYear ? 'date' : undefined}
                onClick={() => {
                  pendingMonthFocusRef.current = selectedMonthNumber - 1;
                  setPickerYear(year);
                  setCalendarMode('months');
                  onOpenChange?.(true);
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
