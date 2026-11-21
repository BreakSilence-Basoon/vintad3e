'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@vintad3e/ui/components';
import { confirmationAvailable } from './fixture-confirmation.mjs';

const box: CSSProperties = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '28rem', overflow: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 8px)' };
const date = (value: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(value);
const change = '{"title":"일정 안내"}';
const errors = {
  'sign-in-required': '로그인이 만료되었거나 새 인증이 필요합니다. 다시 로그인한 뒤 제안을 검토해주세요.',
  'session-revoked': '로그아웃으로 회수된 회사 확인 세션입니다. 다시 인증하는 것만으로 복구되지 않습니다. 관리자에게 회사 전체 로그아웃 완료를 확인한 뒤, 최신 상태를 불러와 명시적으로 다시 로그인해주세요.',
  denied: '이 제안을 열거나 확인할 권한이 없습니다.',
  changed: '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다. 최신 상태를 다시 불러와 검토해주세요.',
  'invalid-request': '확인 요청을 처리하지 못했습니다. 제안을 다시 불러와주세요.',
  unavailable: '변경 확인 서비스에 연결할 수 없습니다. 현재 확인을 진행할 수 없습니다.',
} as const;
type Failure = keyof typeof errors;

export function FixtureConfirmationView({ proposalId }: { proposalId: string }) {
  const [state, setState] = useState('idle');
  const [started, setStarted] = useState(() => Date.now());
  const [proposalExpiry, setProposalExpiry] = useState(started + 15 * 60_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const inFlight = useRef(false);
  const [now, setNow] = useState(started);
  const [presentationExpiry, setPresentationExpiry] = useState(started + 15 * 60_000);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const apply = (record: { state: string; started: number; proposalExpiry: number; presentationExpiry: number }) => {
    if (!['idle', 'loaded', 'reviewed', 'approved'].includes(record.state) || ![record.started, record.proposalExpiry, record.presentationExpiry].every(Number.isFinite)) throw new Error('invalid response');
    setState(record.state); setStarted(record.started); setProposalExpiry(record.proposalExpiry); setPresentationExpiry(record.presentationExpiry);
  };
  const transition = async (action: string) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null); setState('idle');
    try {
      const response = await fetch('/api/fixture/confirmation', { method: 'POST', credentials: 'same-origin', redirect: 'error', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ action }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) { setError(typeof result?.error === 'string' && Object.hasOwn(errors, result.error) ? result.error as Failure : 'unavailable'); return; }
      apply(result);
      setNow(Date.now());
    } catch { setError('unavailable'); } finally { inFlight.current = false; setBusy(false); }
  };
  return <main className="shell staff-console" style={{ width: 'min(var(--content-max), calc(100% - (var(--page-gutter) * 2)))', margin: '0 auto', padding: '34px 0 80px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '28px', minWidth: 0 }}>
    <header className="staff-page__header"><h1>Timetable 변경 확인</h1><p>제안 내용을 직접 읽고 확인해주세요. 확인 후 같은 제안을 만든 Codex에서 실행을 이어갑니다.</p></header>
    <div aria-live="polite" aria-busy={busy}>{busy && <p role="status">제안 상태를 확인하고 있습니다…</p>}{error && <p role="alert">{errors[error]}</p>}</div>
    {(error === 'sign-in-required' || error === 'changed') && <form action="/api/fixture/confirmation-reauth" method="post"><Button variant="default" profile="timetable" type="submit">다시 로그인</Button></form>}
    <Button variant="ghost" profile="timetable" type="button" disabled={busy} onClick={() => void transition('load')}>{state !== 'idle' || error ? '최신 상태 다시 불러오기' : '제안 불러오기'}</Button>
    {state !== 'idle' && <><section className="staff-section" aria-labelledby="confirmation-summary"><h2 id="confirmation-summary">제안 내용</h2><dl><dt>앱</dt><dd>Timetable</dd><dt>작업</dt><dd>일정 이름 변경</dd><dt>대상</dt><dd>schedule:schedule-01</dd><dt>제안 번호</dt><dd>{proposalId}</dd><dt>제안 만료</dt><dd>{date(proposalExpiry)} (한국 시간){now >= proposalExpiry ? ' · 만료됨' : ''}</dd><dt>현재 권한</dt><dd>이 대상의 작업 권한 확인됨 · {date(started)} (한국 시간)</dd><dt>처리 상태</dt><dd role="status">{state === 'approved' ? '확인됨 · 아직 실행되지 않음' : now >= proposalExpiry ? '확인 기한 만료' : '확인 대기'}</dd><dt>제안 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>ce392c32ff1244e0f9db5eb3e0ad7d262749a4d0c9c8645953b9448977bae3b1</dd><dt>권한 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>9fffc3c867282216d769b674b887da3eb65b67bb4b69e98315702cb53095d9aa</dd></dl><h3>실제 변경 데이터</h3><pre style={box}>{change}</pre><h3>서버에 저장된 제안 원문</h3><pre style={box}>{change}</pre></section>
      {state === 'loaded' && confirmationAvailable(now, proposalExpiry) && <form onSubmit={event => { event.preventDefault(); void transition('review'); }}><p>최신 권한과 제안을 다시 확인하여 검토할 내용을 고정합니다.</p><Button variant="primary" profile="timetable" type="submit" disabled={busy}>제안 검토</Button></form>}
      {state === 'reviewed' && <section className="staff-section" aria-labelledby="confirmation-click"><h2 id="confirmation-click">이 내용으로 확인</h2><p>위 원문과 실제 변경 데이터를 검토했습니다. 확인은 {date(presentationExpiry)} (한국 시간)까지 가능합니다.</p><form onSubmit={event => { event.preventDefault(); void transition('confirm'); }}><Button variant="primary" profile="timetable" type="submit" disabled={busy || !confirmationAvailable(now, proposalExpiry, presentationExpiry)}>이 변경 확인</Button></form>{!confirmationAvailable(now, proposalExpiry, presentationExpiry) && <p role="status">검토 기한이 지났거나 권한이 변경되었습니다. 최신 상태를 다시 불러와주세요.</p>}</section>}
      {state === 'approved' && <p role="status">확인 기록이 저장되었습니다. 아직 업무 변경은 실행되지 않았습니다. Codex에서 이 제안의 실행을 이어간 뒤 최신 상태를 확인해주세요.</p>}
    </>}
  </main>;
}
