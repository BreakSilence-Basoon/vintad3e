'use client';
import { useEffect, useState } from 'react';
import { AttendanceHistoryPager } from './attendance-history-pager';
import { FixtureHistoryList } from './fixture-history-list';
import { buildHistoryHref } from './history-filters';
import { fixtureScheduleChanged } from './fixture-linked-attendance';
import { readScheduleOverrides, type ScheduleOverrides } from './fixture-schedule-storage';
import { selfAttendance } from './fixture-self';
import type { AttendanceHistoryFilters } from './attendance-history-filter';

export function FixtureHistorySelf({ filters, now, page }: { filters: AttendanceHistoryFilters; now: number; page: number }) {
  const [state, setState] = useState<{ loaded: boolean; data: ScheduleOverrides | null }>({ loaded: false, data: null });
  useEffect(() => { const reload = () => { try { setState({ loaded: true, data: readScheduleOverrides(sessionStorage) }); } catch { setState({ loaded: true, data: null }); } }; reload(); window.addEventListener(fixtureScheduleChanged, reload); return () => window.removeEventListener(fixtureScheduleChanged, reload); }, []);
  if (!state.loaded) return null;
  if (!state.data) return <div className="state-panel" role="alert"><strong>출근부를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해주세요.</p></div>;
  const records = selfAttendance(state.data, filters, now), visible = records.slice(0, page * 10);
  return <><FixtureHistoryList records={visible} /><AttendanceHistoryPager href={buildHistoryHref(filters, page + 1)} totalCount={records.length} visibleCount={visible.length} /></>;
}
