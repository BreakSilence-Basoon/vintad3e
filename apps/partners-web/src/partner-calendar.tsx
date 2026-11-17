'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@vintad3e/ui/components';
import { eventDates, eventTimeOnDay, monthDays, monthEvents, moveMonth, partnerAreas, type PartnerArea, type ScheduleRead } from './partner-schedule';

export function PartnerCalendar({ data, today }: { data: ScheduleRead; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<PartnerArea | ''>('');
  const selectedArea = filter || undefined;
  const events = data.kind === 'ready' || data.kind === 'partial' ? monthEvents(data.events, month, selectedArea) : [];
  const datedEvents = events.map(event => ({ event, ...eventDates(event) }));
  const forDay = (day: string) => datedEvents.filter(item => day >= item.first && day <= item.last).map(item => item.event);
  const [year, monthNumber] = month.split('-');
  function changeMonth(delta: -1 | 1) { const next = moveMonth(month, delta); if (next) setMonth(next); }
  const message = data.kind === 'denied' ? '일정을 조회할 권한이 없습니다.' : data.kind === 'partial'
    ? `일부 DJ 일정만 표시됩니다.${data.undatedCount ? ` 날짜 미확인 ${data.undatedCount}건.` : ''}`
    : '일정 원천이 아직 연결되지 않았습니다. Library 일정은 표시하지 않습니다.';
  return <section className="partners-calendar" aria-label="협업 일정 캘린더">
    <div className="partners-calendar__toolbar">
      <h2 aria-live="polite">{year}년 {Number(monthNumber)}월</h2>
      <div className="partners-calendar__controls"><Button variant="ghost" onClick={() => changeMonth(-1)} disabled={!moveMonth(month, -1)} aria-label="이전 달">‹</Button><Button variant="ghost" onClick={() => setMonth(today.slice(0, 7))}>오늘</Button><Button variant="ghost" onClick={() => changeMonth(1)} disabled={!moveMonth(month, 1)} aria-label="다음 달">›</Button></div>
      <label className="partners-calendar__filter">일정 종류<select aria-label="일정 종류" value={filter} onChange={event => setFilter(event.target.value as PartnerArea | '')}><option value="">전체</option>{partnerAreas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>
    </div>
    {data.kind !== 'ready' ? <p className="partners-read-state" role="status">{message}</p> : null}
    {data.kind === 'ready' && !events.length ? <p className="staff-muted" role="status">이달에 해당하는 일정이 없습니다.</p> : null}
    <div className="partners-calendar__scroller" role="region" aria-label={`${year}년 ${Number(monthNumber)}월 일정, 가로 스크롤`} tabIndex={0}>
      <div className="partners-calendar__grid">
        <div className="partners-calendar__weekdays" aria-hidden="true">{['일', '월', '화', '수', '목', '금', '토'].map(day => <span key={day}>{day}</span>)}</div>
        <ol className="partners-calendar__days">{monthDays(month).map((day, index) => {
          if (!day) return <li className="partners-calendar__blank" key={`blank-${index}`} aria-hidden="true" />;
          const dayEvents = forDay(day);
          return <li key={day}><div className="partners-calendar__day">
            <time dateTime={day} aria-current={day === today ? 'date' : undefined}>{Number(day.slice(-2))}</time>
            <ul className="partners-calendar__events">{dayEvents.map(event => {
              const detail = [eventTimeOnDay(event, day), ...(event.context ?? [])].join(' · ');
              return <li key={event.id}><Link className="partners-calendar__chip" href={partnerAreas.find(area => area.id === event.area)!.href} aria-label={`${day} ${detail} ${event.title}`}><span>{detail}</span><strong>{event.title}</strong></Link></li>;
            })}</ul>
          </div></li>;
        })}</ol>
      </div>
    </div>
  </section>;
}
