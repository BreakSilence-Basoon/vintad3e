'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '@vintad3e/ui/components';
import { confirmationAvailable } from './fixture-confirmation.mjs';

const box: CSSProperties = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '28rem', overflow: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 8px)' };
const date = (value: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(value);
const change = '{"title":"새 프로젝트"}';

export function FixtureConfirmationView({ proposalId }: { proposalId: string }) {
  const [state, setState] = useState('idle');
  const [started, setStarted] = useState(() => Date.now());
  const [proposalExpiry, setProposalExpiry] = useState(started + 15 * 60_000);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(started);
  const [presentationExpiry, setPresentationExpiry] = useState(started + 15 * 60_000);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const apply = (record: { state: string; started: number; proposalExpiry: number; presentationExpiry: number }) => {
    if (!['idle', 'loaded', 'reviewed', 'approved'].includes(record.state) || ![record.started, record.proposalExpiry, record.presentationExpiry].every(Number.isFinite)) throw new Error('invalid response');
    setState(record.state); setStarted(record.started); setProposalExpiry(record.proposalExpiry); setPresentationExpiry(record.presentationExpiry);
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/fixture/confirmation', { cache: 'no-store', signal: controller.signal }).then(response => { if (!response.ok) throw new Error('unavailable'); return response.json(); }).then(apply).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);
  const transition = async (action: string) => {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }), cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      apply(await response.json());
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <main className="shell staff-console" style={{ width: 'min(var(--content-max), calc(100% - (var(--page-gutter) * 2)))', margin: '0 auto', padding: '34px 0 80px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '28px', minWidth: 0 }}>
    <header className="staff-page__header"><h1>Creative 변경 확인</h1><p>제안 내용을 직접 읽고 확인해주세요. 확인 후 같은 제안을 만든 Codex에서 실행을 이어갑니다.</p></header>
    <Button variant="ghost" profile="timetable" type="button" disabled={busy} onClick={() => void transition('load')}>{state === 'idle' ? '제안 불러오기' : '최신 상태 다시 불러오기'}</Button>
    {error && <p role="alert">제안 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와주세요.</p>}
    {state !== 'idle' && <><section className="staff-section" aria-labelledby="confirmation-summary"><h2 id="confirmation-summary">제안 내용</h2><dl><dt>앱</dt><dd>Creative</dd><dt>작업</dt><dd>프로젝트 이름 변경</dd><dt>대상</dt><dd>project:project-01</dd><dt>제안 번호</dt><dd>{proposalId}</dd><dt>제안 만료</dt><dd>{date(proposalExpiry)} (한국 시간){now >= proposalExpiry ? ' · 만료됨' : ''}</dd><dt>현재 권한</dt><dd>이 대상의 작업 권한 확인됨 · {date(started)} (한국 시간)</dd><dt>처리 상태</dt><dd role="status">{state === 'approved' ? '확인됨 · 아직 실행되지 않음' : now >= proposalExpiry ? '확인 기한 만료' : '확인 대기'}</dd><dt>제안 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>e9afec38ab72ad2c19295f88ce09c0f0c3133f569b3928c6624a639526fb71c4</dd><dt>권한 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>36196fea98f77dff9f806f65a5aa5ccf98f9209ae3da52e6a301da280ecbf7c2</dd></dl><h3>실제 변경 데이터</h3><pre style={box}>{change}</pre><h3>서버에 저장된 제안 원문</h3><pre style={box}>{change}</pre></section>
      {state === 'loaded' && confirmationAvailable(now, proposalExpiry) && <form onSubmit={event => { event.preventDefault(); void transition('review'); }}><p>최신 권한과 제안을 다시 확인하여 검토할 내용을 고정합니다.</p><Button variant="primary" profile="timetable" type="submit" disabled={busy}>제안 검토</Button></form>}
      {state === 'reviewed' && <section className="staff-section" aria-labelledby="confirmation-click"><h2 id="confirmation-click">이 내용으로 확인</h2><p>위 원문과 실제 변경 데이터를 검토했습니다. 확인은 {date(presentationExpiry)} (한국 시간)까지 가능합니다.</p><form onSubmit={event => { event.preventDefault(); void transition('confirm'); }}><Button variant="primary" profile="timetable" type="submit" disabled={busy || !confirmationAvailable(now, proposalExpiry, presentationExpiry)}>이 변경 확인</Button></form>{!confirmationAvailable(now, proposalExpiry, presentationExpiry) && <p role="status">검토 기한이 지났거나 권한이 변경되었습니다. 최신 상태를 다시 불러와주세요.</p>}</section>}
      {state === 'approved' && <p role="status">확인 기록이 저장되었습니다. 아직 업무 변경은 실행되지 않았습니다. Codex에서 이 제안의 실행을 이어간 뒤 최신 상태를 확인해주세요.</p>}
    </>}
  </main>;
}
