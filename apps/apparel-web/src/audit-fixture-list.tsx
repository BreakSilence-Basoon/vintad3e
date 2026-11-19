import type { FixtureAudit } from './audit-fixture';

const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });
export function AuditFixtureList({ entries }: { entries: FixtureAudit[] }) {
  if (!entries.length) return <p className="audit-empty">아직 표시할 수정 이력이 없습니다.</p>;
  return <>{entries.map(entry => <article key={entry.id} className="audit-card"><div className="audit-card__topline"><time dateTime={entry.occurredAt}>{date.format(new Date(entry.occurredAt))}</time><span className="audit-card__actor">{entry.actorLabel}</span></div><p className="audit-card__summary">{entry.summary}</p></article>)}</>;
}
