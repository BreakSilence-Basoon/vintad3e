'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { AttendanceDateTimeField } from './attendance-date-time-field';
import { formatSeoulDateTime, toSeoulDateTimeInput } from './date-time';
import { scheduleInputInstant, type ScheduleOverride, type ScheduleOverrides } from './fixture-schedule-storage';
import { fixtureScheduleOverlaps } from './fixture-schedule-overlap';
import type { FixtureScheduleEntry } from './fixture-schedule-entries';

const memoMessage = '수정하거나 삭제하려면 메모를 작성해주세요.';
export function FixtureScheduleEditor({ shift, changes, onClose, onSave }: { shift: FixtureScheduleEntry; changes: ScheduleOverrides; onClose: () => void; onSave: (value: ScheduleOverride) => boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(shift.startInput), [end, setEnd] = useState(shift.endInput);
  const [checkIn, setCheckIn] = useState(shift.attendance ? toSeoulDateTimeInput(shift.attendance.startsAt) : '');
  const [checkOut, setCheckOut] = useState(shift.attendance?.endsAt ? toSeoulDateTimeInput(shift.attendance.endsAt) : '');
  const [note, setNote] = useState(shift.note), [confirmed, setConfirmed] = useState(false), [deleting, setDeleting] = useState(false), [error, setError] = useState('');
  const initialCheckIn = shift.attendance ? toSeoulDateTimeInput(shift.attendance.startsAt) : '';
  const initialCheckOut = shift.attendance?.endsAt ? toSeoulDateTimeInput(shift.attendance.endsAt) : '';
  const attendanceChanged = checkIn !== initialCheckIn || checkOut !== initialCheckOut;
  const coreLocked = Boolean(shift.attendance);
  const canEditAttendance = coreLocked || (scheduleInputInstant(shift.startInput) ?? Infinity) - 6 * 3600000 <= Date.now();
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close(); }; }, []);
  function requireMemo() { if (note.trim()) return true; setError(memoMessage); return false; }
  function save() {
    if (!requireMemo()) return;
    const startMs = scheduleInputInstant(start), endMs = scheduleInputInstant(end);
    if (startMs === null || endMs === null || endMs <= startMs) { setError('종료 시각은 시작 시각보다 뒤여야 합니다.'); return; }
    const normalizedNote = note.trim();
    if (start === shift.startInput && end === shift.endInput && !attendanceChanged && normalizedNote === shift.note) { onClose(); return; }
    if (coreLocked && (start !== shift.startInput || end !== shift.endInput)) { setError('출퇴근 원본 기록이 있는 근무는 직원·매장·시간을 바꿀 수 없습니다. 메모만 수정할 수 있습니다.'); return; }
    if ((start !== shift.startInput || end !== shift.endInput) && fixtureScheduleOverlaps(shift.id, start, end, changes)) { setError('이 직원의 기존 근무와 시간이 겹칩니다.'); return; }
    if (attendanceChanged && !canEditAttendance) { setError('출근 기록을 먼저 등록해주세요.'); return; }
    const inMs = checkIn ? scheduleInputInstant(checkIn) : null, outMs = checkOut ? scheduleInputInstant(checkOut) : null;
    if (checkIn && inMs === null || checkOut && outMs === null || !checkIn && checkOut) { setError('출근 기록을 먼저 등록해주세요.'); return; }
    if (outMs !== null && inMs !== null && outMs <= inMs) { setError('퇴근 시각은 출근 시각보다 늦어야 합니다.'); return; }
    if (attendanceChanged && ((inMs !== null && inMs > Date.now()) || (outMs !== null && outMs > Date.now()))) { setError(shift.attendance ? '아직 지나지 않은 미래 시각으로 출퇴근 기록을 정정할 수 없습니다.' : '아직 지나지 않은 미래 시각으로 출퇴근 기록을 추가할 수 없습니다.'); return; }
    if (attendanceChanged && [inMs, outMs].some(value => value !== null && (value < startMs - 6 * 3600000 || value > endMs + 12 * 3600000))) { setError('출퇴근 시각은 예정 근무의 허용 범위 안에서만 입력할 수 있습니다.'); return; }
    if (shift.attendance?.endsAt && !checkOut && !confirmed) { setError('기존 퇴근 기록 삭제를 확인해주세요.'); return; }
    const attendance = inMs === null ? null : { startsAt: checkIn === initialCheckIn && shift.attendance ? shift.attendance.startsAt : new Date(inMs).toISOString(), endsAt: outMs === null ? null : checkOut === initialCheckOut && shift.attendance?.endsAt ? shift.attendance.endsAt : new Date(outMs).toISOString() };
    if (!onSave({ startInput: start, endInput: end, note: normalizedNote, attendance })) { setError('저장하지 못했습니다.'); return; }
    onClose();
  }
  return <dialog ref={dialogRef} className="schedule-dialog schedule-shift-editor" aria-labelledby="schedule-shift-editor-title" data-slide-swipe-ignore onCancel={event => { event.preventDefault(); onClose(); }}><div className="schedule-dialog__panel">
    <header className="schedule-dialog__header"><h2 id="schedule-shift-editor-title">{shift.employee.displayName} {shift.location.label} 근무</h2><button type="button" className="schedule-dialog__close" aria-label="일정 입력 창 닫기" onClick={onClose}>×</button></header>
    <form autoComplete="off" className="schedule-dialog__form" onSubmit={event => { event.preventDefault(); save(); }}><div className="schedule-dialog__fields">
      <AttendanceDateTimeField disabled={coreLocked} label="예정 시작" labelClassName="schedule-shift-editor__field-label" name="startsAt" value={start} onChange={setStart} required />
      <AttendanceDateTimeField disabled={coreLocked} label="예정 종료" labelClassName="schedule-shift-editor__field-label" name="endsAt" value={end} onChange={setEnd} required />
      {canEditAttendance ? <><AttendanceDateTimeField label="실제 출근" labelClassName="schedule-shift-editor__field-label" name="checkInAt" value={checkIn} onChange={setCheckIn} /><AttendanceDateTimeField label="실제 퇴근" labelClassName="schedule-shift-editor__field-label" name="checkOutAt" value={checkOut} onChange={setCheckOut} /></> : <><label><span className="schedule-shift-editor__field-label">실제 출근</span><input type="text" value={shift.attendance?.startsAt ? formatSeoulDateTime(shift.attendance.startsAt) : '기록 없음'} disabled readOnly /></label><label><span className="schedule-shift-editor__field-label">실제 퇴근</span><input type="text" value={shift.attendance?.endsAt ? formatSeoulDateTime(shift.attendance.endsAt) : '기록 없음'} disabled readOnly /></label></>}
      <label className="schedule-dialog__field--wide"><span className="schedule-shift-editor__field-label">메모</span><input type="text" name="note" autoCapitalize="none" autoComplete="off" autoCorrect="off" value={note} onChange={event => { setNote(Array.from(event.target.value).slice(0, 500).join('')); setError(''); }} spellCheck={false} /></label>
      {shift.attendance?.endsAt && !checkOut ? <label className="schedule-dialog__field--wide"><input type="checkbox" name="confirmClearCheckOut" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />기존 퇴근 기록을 삭제하고 출근 중 상태로 되돌립니다.</label> : null}
    </div>
    {error ? <p className="schedule-dialog__message schedule-dialog__message--error" role="alert">{error}</p> : null}
    {deleting ? <div className="attendance-history-editor__delete-confirmation"><p>이 카드의 출퇴근 기록을 모두 삭제할까요?</p><div className="attendance-history-editor__delete-actions"><Button type="button" variant="ghost" profile="timetable" onClick={() => setDeleting(false)}>취소</Button><Button type="button" variant="ghost" appearanceSlot="text-danger" profile="timetable" onClick={() => { if (!requireMemo()) return; if (!onSave(null)) { setError('근무를 삭제하지 못했습니다.'); return; } onClose(); }}>삭제 확인</Button></div></div> : <div className="schedule-dialog__actions"><Button type="button" variant="ghost" appearanceSlot="text-danger" profile="timetable" onClick={() => { if (requireMemo()) setDeleting(true); }}>삭제</Button><Button type="submit" variant="primary" profile="timetable" disabled={attendanceChanged && !checkIn}>수정</Button></div>}
    </form>
  </div></dialog>;
}
