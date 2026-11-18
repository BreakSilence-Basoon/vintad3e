'use client';

import { Button, Input, NativeSelect } from '@vintad3e/ui/components';
import { Fragment, useState, type FormEvent } from 'react';

export type AuditRow = { when: string; actor: string; target: string; summary: string; id: string; operation: string };

type Filters = { keyword: string; range: string; from: string; to: string; actor: string; sort: string };
const initial: Filters = { keyword: '', range: 'all', from: '', to: '', actor: 'all', sort: 'desc' };
const day = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(value));
const dateTime = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

export function AuditView({ rows }: { rows: readonly AuditRow[] }) {
  const [draft, setDraft] = useState<Filters>(initial);
  const [filters, setFilters] = useState<Filters>(initial);
  const [dateOpen, setDateOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [nowMs, setNowMs] = useState(0);
  const today = day(new Date(nowMs));
  const earlier = (days: number) => day(new Date(nowMs - days * 86400000));
  const start = filters.range === 'today' ? today : filters.range === '7d' ? earlier(6) : filters.range === '30d' ? earlier(29) : filters.range === 'custom' ? filters.from : '';
  const end = filters.range === 'today' || filters.range === '7d' || filters.range === '30d' ? today : filters.range === 'custom' ? filters.to : '';
  const matching = rows.filter(row => {
    const rowDay = day(new Date(row.when));
    const text = `${row.actor} ${row.target} ${row.summary}`.toLocaleLowerCase('ko-KR');
    return (!filters.keyword || text.includes(filters.keyword.toLocaleLowerCase('ko-KR'))) && (filters.actor === 'all' || row.actor === filters.actor) && (!start || rowDay >= start) && (!end || rowDay <= end);
  }).sort((a, b) => filters.sort === 'asc' ? a.when.localeCompare(b.when) : b.when.localeCompare(a.when));
  const visible = matching.slice(0, limit);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setNowMs(Date.now()); setFilters({ ...draft, keyword: draft.keyword.trim() }); setDateOpen(false); setLimit(10); }
  function reset() { setDraft(initial); setFilters(initial); setDateOpen(false); setLimit(10); }
  return <div className="audit-list">
    <form className="audit-filter-bar" onSubmit={submit}>
      <label className="audit-filter-bar__keyword"><span className="preview-visually-hidden">키워드</span><Input appearance="native" type="search" placeholder="키워드를 입력하세요!" value={draft.keyword} onChange={e => setDraft({ ...draft, keyword: e.target.value })} /></label>
      <div className="audit-filter-bar__range"><label><span className="preview-visually-hidden">기간</span><NativeSelect appearance="native" value={draft.range} onClick={() => { if (draft.range === 'custom') setDateOpen(true); }} onChange={e => { setDraft({ ...draft, range: e.target.value }); setDateOpen(e.target.value === 'custom'); }}><option value="all">전체 기간</option><option value="today">오늘</option><option value="7d">최근 7일</option><option value="30d">최근 30일</option><option value="custom">직접 지정</option></NativeSelect></label>
        {draft.range === 'custom' && dateOpen && <div className="date-range-popover"><div className="date-range-popover__panel" role="group" aria-label="기간 직접 지정"><div className="date-range-popover__grid"><label><span>시작일</span><Input appearance="native" type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label><label><span>종료일</span><Input appearance="native" type="date" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label></div><div className="date-range-popover__actions"><Button profile="timetable" type="button" variant="primary" size="small" onClick={() => setDateOpen(false)}>닫기</Button></div></div></div>}
      </div>
      <label><span className="preview-visually-hidden">실행자</span><NativeSelect appearance="native" value={draft.actor} onChange={e => setDraft({ ...draft, actor: e.target.value })}><option value="all">실행자 전체</option>{[...new Set(rows.map(row => row.actor))].map(actor => <option key={actor} value={actor}>{actor}</option>)}</NativeSelect></label>
      <label><span className="preview-visually-hidden">정렬</span><NativeSelect appearance="native" value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value })}><option value="desc">최신순</option><option value="asc">오래된순</option></NativeSelect></label>
      <div className="audit-filter-bar__actions"><Button profile="timetable" type="button" variant="ghost" size="small" onClick={reset}>초기화</Button><Button profile="timetable" type="submit" variant="primary" size="small">적용</Button></div>
    </form>
    {matching.length === 0 && <p className="audit-empty">아직 표시할 수정 이력이 없습니다.</p>}
    {visible.map((row, index) => <Fragment key={row.id}>{(index === 0 || day(new Date(visible[index - 1].when)) !== day(new Date(row.when))) && <h2 className="audit-date">{dateLabel(row.when)}</h2>}<article className="audit-card"><div className="audit-card__topline"><time dateTime={row.when}>{dateTime(row.when)}</time><span className="audit-card__actor">{row.actor}</span></div><div className="audit-card__body"><p className="audit-card__summary">{row.target} · {row.summary}</p><details><summary>상세 보기</summary><dl><div><dt>기록 ID</dt><dd>{row.id}</dd></div><div><dt>작업 코드</dt><dd>{row.operation}</dd></div></dl></details></div></article></Fragment>)}
    {matching.length > 10 && <nav className="load-more-pager" aria-label="변경 이력 더 불러오기"><span>{visible.length} / {matching.length}</span>{visible.length < matching.length && <Button profile="timetable" type="button" variant="ghost" size="small" onClick={() => setLimit(limit + 10)}>더 불러오기</Button>}</nav>}
  </div>;
}
