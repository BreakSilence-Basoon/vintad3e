'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@vintad3e/ui/components';
import { formatSeoulDateTime } from './date-time';

export function FixtureScheduleDetail({ date, employee, location, onClose, startInput = `${date}T09:00`, endInput = `${date}T18:00`, attendance = null, note = '' }: { date: string; employee: string; location: string; onClose: () => void; startInput?: string; endInput?: string; attendance?: { startsAt: string; endsAt: string | null } | null; note?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="schedule-dialog schedule-shift-editor" aria-labelledby="schedule-shift-editor-title" data-slide-swipe-ignore onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="schedule-dialog__panel">
      <header className="schedule-dialog__header"><h2 id="schedule-shift-editor-title">{employee} {location} 근무</h2><button type="button" className="schedule-dialog__close" aria-label="일정 입력 창 닫기" onClick={onClose}>×</button></header>
      <form className="schedule-dialog__form" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
        <div className="schedule-dialog__fields">
          {([['예정 시작', startInput], ['예정 종료', endInput]] as const).map(([label, value]) => <div className="attendance-history-editor__date-time-field" key={label}><span className="schedule-shift-editor__field-label">{label}</span><span className="attendance-history-editor__date-time-control"><button type="button" className="attendance-history-editor__date-time-trigger" aria-label={`${label} 달력 열기`} disabled><span>{value.replace('T', ' ')}</span><span aria-hidden="true">▾</span></button><input type="datetime-local" aria-label={label} value={value} disabled readOnly /></span></div>)}
          {([['실제 출근', attendance?.startsAt], ['실제 퇴근', attendance?.endsAt]] as const).map(([label, value]) => <label key={label}><span className="schedule-shift-editor__field-label">{label}</span><input type="text" value={value ? formatSeoulDateTime(value) : '기록 없음'} disabled readOnly /></label>)}
          <label className="schedule-dialog__field--wide"><span className="schedule-shift-editor__field-label">메모</span><input type="text" value={note} disabled readOnly /></label>
        </div>
        <div className="schedule-dialog__actions"><span /><Button type="button" variant="primary" profile="timetable" onClick={onClose}>닫기</Button></div>
      </form>
    </div>
  </dialog>;
}
