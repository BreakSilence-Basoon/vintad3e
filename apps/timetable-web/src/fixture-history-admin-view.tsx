'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { AttendanceDateTimeField } from './attendance-date-time-field';
import { AttendanceHistoryPager } from './attendance-history-pager';
import { FixtureHistoryList } from './fixture-history-list';
import { toSeoulDateTimeInput } from './date-time';
import { buildHistoryHref } from './history-filters';
import { fixtureHistoryDay, historyNotInFuture, historyWithinShiftWindow, parseHistoryEdits, selectHistory, type HistoryEdits, type HistoryRecord } from './fixture-history-admin';
import type { AttendanceHistoryFilters } from './attendance-history-filter';

const slot = 'vintad3e-timetable-history-fixture';
const memoRequired = '수정하거나 삭제하려면 메모를 작성해주세요.';
function inputInstant(input: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return null;
  const parsed = new Date(`${input}:00+09:00`);
  return Number.isFinite(parsed.getTime()) && toSeoulDateTimeInput(parsed) === input ? parsed.toISOString() : null;
}
function HistoryEditor({ record, originalStart, onClose, onSave }: { record: HistoryRecord; originalStart: string; onClose: () => void; onSave: (value: HistoryRecord | null) => boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(toSeoulDateTimeInput(record.startsAt));
  const [end, setEnd] = useState(record.endsAt ? toSeoulDateTimeInput(record.endsAt) : '');
  const [note, setNote] = useState(record.note ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close(); }; }, []);
  function validateMemo() { if (note.trim()) return true; setError(memoRequired); return false; }
  function save() {
    if (!validateMemo()) return;
    const startsAt = start === toSeoulDateTimeInput(record.startsAt) ? record.startsAt : inputInstant(start);
    const endsAt = record.endsAt && end === toSeoulDateTimeInput(record.endsAt) ? record.endsAt : end ? inputInstant(end) : null;
    if (!startsAt || end && !endsAt) { setError('정정할 출퇴근 시각이 필요합니다.'); return; }
    if (endsAt && endsAt <= startsAt) { setError('퇴근 시각은 출근 시각보다 늦어야 합니다.'); return; }
    if (!historyNotInFuture(startsAt, endsAt, Date.now())) { setError('아직 지나지 않은 미래 시각으로 출퇴근 기록을 정정할 수 없습니다.'); return; }
    if (!historyWithinShiftWindow(originalStart, startsAt, endsAt)) { setError('출퇴근 시각은 예정 근무의 허용 범위 안에서만 입력할 수 있습니다.'); return; }
    if (record.endsAt && !endsAt && !confirmed) return;
    if (startsAt === record.startsAt && endsAt === record.endsAt) { setError('변경된 출퇴근 시각이 없습니다.'); return; }
    if (!onSave({ ...record, startsAt, endsAt, note })) { setError('출퇴근 시각을 저장하지 못했습니다.'); return; }
    onClose();
  }
  return <dialog ref={ref} className="attendance-history-editor" aria-labelledby="attendance-history-editor-title" data-slide-swipe-ignore onCancel={event => { event.preventDefault(); onClose(); }}><div className="attendance-history-editor__panel">
    <header className="attendance-history-editor__header"><h2 id="attendance-history-editor-title">직원</h2><button type="button" className="attendance-history-editor__close" aria-label="출퇴근 시각 입력 창 닫기" onClick={onClose}>×</button></header>
    <form autoComplete="off" className="attendance-history-editor__form" onSubmit={event => { event.preventDefault(); save(); }}>
      <div className="attendance-history-editor__date-time-row"><AttendanceDateTimeField label="출근" name="checkInAt" value={start} required onChange={setStart} /><AttendanceDateTimeField label="퇴근" name="checkOutAt" value={end} onChange={setEnd} /></div>
      {record.endsAt && !end ? <label className="attendance-history-editor__confirmation"><input type="checkbox" checked={confirmed} required onChange={event => setConfirmed(event.target.checked)} />기존 퇴근 기록을 삭제하고 출근 중 상태로 되돌립니다.</label> : null}
      <label>메모<input type="text" name="reason" autoCapitalize="none" autoComplete="off" autoCorrect="off" value={note} placeholder="메모를 입력하세요" onChange={event => { setNote(Array.from(event.target.value).slice(0, 500).join('')); setError(''); }} spellCheck={false} /></label>
      {error ? <p className="attendance-history-editor__message attendance-history-editor__message--error" role="alert">{error}</p> : null}
      {deleting ? <div className="attendance-history-editor__delete-confirmation"><p>이 카드의 출퇴근 기록을 모두 삭제할까요?</p><div className="attendance-history-editor__delete-actions"><Button type="button" variant="ghost" profile="timetable" onClick={() => setDeleting(false)}>취소</Button><Button type="button" variant="ghost" appearanceSlot="text-danger" profile="timetable" onClick={() => { if (!validateMemo()) return; if (!onSave(null)) { setError('출퇴근 시각을 저장하지 못했습니다.'); return; } onClose(); }}>삭제 확인</Button></div></div> : <div className="attendance-history-editor__actions"><Button type="button" variant="ghost" appearanceSlot="text-danger" profile="timetable" onClick={() => { if (validateMemo()) setDeleting(true); }}>삭제</Button><Button type="submit" variant="primary" profile="timetable">수정</Button></div>}
    </form>
  </div></dialog>;
}
export function FixtureHistoryAdmin({ base, filters, now, page }: { base: HistoryRecord[]; filters: AttendanceHistoryFilters; now: number; page: number }) {
  const day = fixtureHistoryDay(now);
  const [edits, setEdits] = useState<HistoryEdits>({});
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  useEffect(() => { try { setEdits(parseHistoryEdits(sessionStorage.getItem(slot) ?? '{}', day)); } catch { setEdits({}); } setLoaded(true); }, [day]);
  const records = selectHistory(base, edits, filters, now), visible = records.slice(0, page * 10);
  function save(value: HistoryRecord | null) {
    if (!selected) return false;
    const next = { ...edits, [selected.id]: value === null ? null : { startsAt: value.startsAt, endsAt: value.endsAt, note: value.note ?? '' } };
    try { const encoded = JSON.stringify({ day, edits: next }); if (!Object.hasOwn(parseHistoryEdits(encoded, day), selected.id)) return false; sessionStorage.setItem(slot, encoded); setEdits(next); return true; } catch { return false; }
  }
  return <><FixtureHistoryList records={visible} onSelect={loaded ? setSelected : undefined} /><AttendanceHistoryPager href={buildHistoryHref(filters, page + 1, true)} totalCount={records.length} visibleCount={visible.length} />{selected ? <HistoryEditor key={selected.id} record={selected} originalStart={base.find(item => item.id === selected.id)!.startsAt} onClose={() => setSelected(null)} onSave={save} /> : null}</>;
}
