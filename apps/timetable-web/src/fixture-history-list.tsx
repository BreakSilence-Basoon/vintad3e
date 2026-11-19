import type { HistoryRecord } from './fixture-history-admin';

const formatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: 'numeric', timeZone: 'Asia/Seoul', year: 'numeric' });
function format(at: string) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(at)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const hour = Number(parts.hour);
  return `${parts.year}. ${Number(parts.month)}. ${Number(parts.day)}. ${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${parts.minute}`;
}

export function FixtureHistoryList({ records, onSelect }: { records: HistoryRecord[]; onSelect?: (record: HistoryRecord) => void }) {
  if (!records.length) return <p className="attendance-history-empty">아직 표시할 출퇴근 기록이 없습니다.</p>;
  return <>{records.map(record => {
    const className = `attendance-history-card attendance-history-card--${record.endsAt ? 'checked-out' : 'checked-in'}`;
    const employee = record.employeeName ?? '직원';
    const content = <><span className="sr-only">{record.endsAt ? '퇴근 완료' : '출근 중'}</span><span className="attendance-history-card__employee" title={employee}>{employee}</span><span className="attendance-history-card__times"><span className="attendance-history-card__time-row"><span className="attendance-history-card__event-label">출근</span><time dateTime={record.startsAt}>{format(record.startsAt)}</time></span>{record.endsAt ? <span className="attendance-history-card__time-row"><span className="attendance-history-card__event-label">퇴근</span><time dateTime={record.endsAt}>{format(record.endsAt)}</time></span> : null}</span><span className="attendance-history-card__device">기기 정보 없음</span>{record.note ? <span className="attendance-history-card__note">{record.note}</span> : null}</>;
    return onSelect ? <button key={record.id} type="button" className={`${className} attendance-history-card--interactive`} data-hydrated="true" aria-label={`${employee}, 출근 ${format(record.startsAt)}, ${record.endsAt ? '퇴근 완료' : '출근 중'}, 출퇴근 시각 입력 및 수정`} onClick={() => onSelect(record)}>{content}</button> : <article key={record.id} className={className}>{content}</article>;
  })}</>;
}
