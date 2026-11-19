'use client';
import { useEffect, useRef, useState } from 'react';
import { showStaffToast } from '@vintad3e/ui/toast';
import { SortToggleButton, type SortDirection } from './sort-toggle-button';
import { SettlementPaymentCheckbox } from './settlement-payment-checkbox';
import { koreanYear, nextKoreanYearBoundary, settlementViewerLastYear, settlementViewerMonths } from './settlement-viewer-calendar';
import { readFixturePayouts, writeFixturePayout, type FixturePayouts } from './settlement-fixture-storage';

const krw = new Intl.NumberFormat('ko-KR');
const amountFor = (staff: string, month: string) => staff === 'supporter-1' && month === '2026-10' ? 10000 : null;
function todayInKorea() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function SettlementFixtureTable({ staff, currentYear }: { staff: string; currentYear: number }) {
  const [viewerCurrentYear, setViewerCurrentYear] = useState(currentYear);
  const [year, setYear] = useState(currentYear);
  const [sort, setSort] = useState<{ key: 'month' | 'amount'; direction: SortDirection }>({ key: 'month', direction: 'desc' });
  const [phase, setPhase] = useState<'idle' | 'leaving' | 'arriving'>('idle');
  const [yearDirection, setYearDirection] = useState<'previous' | 'next'>('next');
  const [payouts, setPayouts] = useState<FixturePayouts | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSelectableYear = settlementViewerLastYear(viewerCurrentYear);
  const selectedYear = Number.isInteger(year) && year >= 2026 && year <= lastSelectableYear ? year : viewerCurrentYear;
  const months = settlementViewerMonths(selectedYear);
  const monthKey = (month: number) => `${selectedYear}-${String(month).padStart(2, '0')}`;
  if (sort.key === 'month' && sort.direction === 'desc') months.reverse();
  if (sort.key === 'amount') months.sort((a, b) => {
    const left = amountFor(staff, monthKey(a)), right = amountFor(staff, monthKey(b));
    if (left === null || right === null) return left === right ? b - a : left === null ? 1 : -1;
    return (sort.direction === 'asc' ? left - right : right - left) || b - a;
  });
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);
  useEffect(() => {
    try {
      const saved = readFixturePayouts(window.sessionStorage, staff);
      setPayouts(saved);
      if (saved === null) showStaffToast('정산 내역을 불러올 수 없습니다.', 'error');
    } catch { setPayouts(null); showStaffToast('정산 내역을 불러올 수 없습니다.', 'error'); }
  }, [staff]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => { const now = new Date(); setViewerCurrentYear(koreanYear(now)); timer = setTimeout(update, Math.min(nextKoreanYearBoundary(now) - now.getTime(), 2_147_483_647)); };
    const visible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); update(); } };
    update(); document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  function changePaid(key: string, paid: boolean) {
    try {
      const next = writeFixturePayout(window.sessionStorage, staff, key, paid, todayInKorea());
      if (next === null) { showStaffToast('지급 상태를 확인할 수 없습니다.', 'error'); return; }
      setPayouts(next);
    } catch { showStaffToast('지급 상태를 확인할 수 없습니다.', 'error'); }
  }
  function moveYear(delta: -1 | 1) {
    const next = selectedYear + delta;
    if (phase !== 'idle' || next < 2026 || next > lastSelectableYear) return;
    setYearDirection(delta > 0 ? 'next' : 'previous');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setYear(next); return; }
    setPhase('leaving'); timerRef.current = setTimeout(() => { setYear(next); setPhase('arriving'); timerRef.current = null; frameRef.current = requestAnimationFrame(() => { frameRef.current = requestAnimationFrame(() => { setPhase('idle'); frameRef.current = null; }); }); }, 160);
  }
  function header(key: 'month' | 'amount', label: string) {
    const active = sort.key === key, direction = active ? sort.direction : 'desc';
    const nextDirection = active && direction === 'desc' ? '오름차순' : '내림차순';
    return <th scope="col" aria-sort={active ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}><SortToggleButton label={label} direction={direction} active={active} className="sort-toggle-button--table" title={`${label} ${nextDirection}으로 정렬`} onClick={() => setSort(current => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))} /></th>;
  }
  return <div className={`settlement-history__content${phase === 'idle' ? '' : ` is-${phase}`}`} data-direction={yearDirection}>
    <div className="settlement-history__year" aria-label="정산 연도 선택"><button type="button" aria-label="이전 연도" disabled={phase !== 'idle' || selectedYear <= 2026} onClick={() => moveYear(-1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 4-6 6 6 6" /></svg></button><span className="settlement-history__year-value" aria-live="polite">{selectedYear}년</span><button type="button" aria-label="다음 연도" disabled={phase !== 'idle' || selectedYear >= lastSelectableYear} onClick={() => moveYear(1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 4 6 6-6 6" /></svg></button></div>
    <div className="settlement-history__table-wrap"><table className="settlement-history__table"><thead><tr>{header('month', '정산 월')}{header('amount', '정산 금액')}<th scope="col">지급 상태</th></tr></thead><tbody>{months.map(month => {
      const key = monthKey(month), amount = amountFor(staff, key), status = payouts?.[key];
      return <tr key={month}><td className="settlement-history__month">{month}월</td>{amount === null ? <td className="settlement-history__unavailable" aria-label="정산 금액 정보 없음">—</td> : <td className="settlement-history__month">{krw.format(amount)}원</td>}<td><SettlementPaymentCheckbox paid={payouts === null ? null : status?.paid ?? false} statusKnown={payouts !== null} checkedDate={status?.checkedDate ?? null} isAdmin onChange={payouts === null ? undefined : paid => changePaid(key, paid)} /></td></tr>;
    })}</tbody></table></div>
  </div>;
}
