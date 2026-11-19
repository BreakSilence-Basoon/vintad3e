'use client';
import { useState, type CSSProperties } from 'react';
import { Button } from '@vintad3e/ui/components';
import { nextConfirmationState } from './fixture-confirmation.mjs';

const box: CSSProperties = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '28rem', overflow: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 8px)' };
const change = '{"title":"새 프로젝트"}';

export function FixtureConfirmationView({ proposalId }: { proposalId: string }) {
  const [state, setState] = useState('idle');
  const transition = (action: string) => setState(current => nextConfirmationState(current, action));
  return <main className="shell staff-console" style={{ width: 'min(var(--content-max), calc(100% - (var(--page-gutter) * 2)))', margin: '0 auto', padding: '34px 0 80px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '28px', minWidth: 0 }}>
    <header className="staff-page__header"><h1>Creative 변경 확인</h1><p>제안 내용을 직접 읽고 확인해주세요. 확인 후 같은 제안을 만든 Codex에서 실행을 이어갑니다.</p></header>
    <Button variant="ghost" profile="timetable" type="button" onClick={() => transition('load')}>{state === 'idle' ? '제안 불러오기' : '최신 상태 다시 불러오기'}</Button>
    {state !== 'idle' && <><section className="staff-section" aria-labelledby="confirmation-summary"><h2 id="confirmation-summary">제안 내용</h2><dl><dt>앱</dt><dd>Creative</dd><dt>작업</dt><dd>프로젝트 이름 변경</dd><dt>대상</dt><dd>project:project-01</dd><dt>제안 번호</dt><dd>{proposalId}</dd><dt>현재 권한</dt><dd>이 대상의 작업 권한 확인됨</dd><dt>처리 상태</dt><dd role="status">{state === 'approved' ? '확인됨 · 아직 실행되지 않음' : '확인 대기'}</dd></dl><h3>실제 변경 데이터</h3><pre style={box}>{change}</pre><h3>서버에 저장된 제안 원문</h3><pre style={box}>{change}</pre></section>
      {state === 'loaded' && <form onSubmit={event => { event.preventDefault(); transition('review'); }}><p>최신 권한과 제안을 다시 확인하여 검토할 내용을 고정합니다.</p><Button variant="primary" profile="timetable" type="submit">제안 검토</Button></form>}
      {state === 'reviewed' && <section className="staff-section" aria-labelledby="confirmation-click"><h2 id="confirmation-click">이 내용으로 확인</h2><p>위 원문과 실제 변경 데이터를 검토했습니다.</p><form onSubmit={event => { event.preventDefault(); transition('confirm'); }}><Button variant="primary" profile="timetable" type="submit">이 변경 확인</Button></form></section>}
      {state === 'approved' && <p role="status">확인 기록이 저장되었습니다. 아직 업무 변경은 실행되지 않았습니다. Codex에서 이 제안의 실행을 이어간 뒤 최신 상태를 확인해주세요.</p>}
    </>}
  </main>;
}
