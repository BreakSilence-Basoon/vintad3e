'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { confirmationPayloadText, escapeConfirmationText } from './fixture-confirmation-display';

type RecordView = { proposalId: string; kind: 'single' | 'batch'; state: 'loaded' | 'reviewed' | 'approved' | 'executed'; checkedAt: number; expiresAt: number; example: { operation: string; target: string; change: unknown }; summary: { title: string; createdAt: string; sourceSha256: string } | null; canonical: string; changeDigest: string; permissionDigest: string };
const preStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '28rem', overflow: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 8px)' } as const;
export function FixtureIrConfirmation({ proposalId }: { proposalId: string }) {
  const [record, setRecord] = useState<RecordView | null>(null), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(true);
  const inFlight = useRef(false);
  const request = useCallback(async (action?: 'review' | 'confirm' | 'execute' | 'apply') => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(null);
    try {
      let response = await fetch(action ? '/api/fixture/ir-confirmation' : `/api/fixture/ir-confirmation?proposalId=${encodeURIComponent(proposalId)}`, { method: action ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: action ? { 'content-type': 'application/json' } : {}, ...(action ? { body: JSON.stringify({ action, proposalId }) } : {}), signal: AbortSignal.timeout(15000) });
      if (!action && response.status === 404) {
        const proof = sessionStorage.getItem(`vintad3e-library-ir-recovery:${proposalId}`);
        if (proof && /^[A-Za-z0-9_-]{43}$/.test(proof)) response = await fetch('/api/fixture/ir-confirmation', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'restore', proposalId, proof }), signal: AbortSignal.timeout(15000) });
      }
      if (response.status === 401) { setError('sign-in-required'); return; }
      const next = response.ok ? await response.json() : null;
      if (!next || next.proposalId !== proposalId || !['single', 'batch'].includes(next.kind) || !['loaded', 'reviewed', 'approved', 'executed'].includes(next.state) || !Number.isFinite(next.checkedAt) || !Number.isFinite(next.expiresAt) || next.expiresAt <= Date.now() || !next.example || next.example.operation !== (next.kind === 'single' ? 'library.ir.import' : 'library.ir.batch-import') || next.example.target !== 'ir-import' || typeof next.canonical !== 'string' || JSON.stringify(next.example.change) !== next.canonical || !/^[a-f0-9]{64}$/.test(next.changeDigest) || !/^[a-f0-9]{64}$/.test(next.permissionDigest)) throw new Error('unavailable');
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(next.canonical))), value => value.toString(16).padStart(2, '0')).join('');
      if (next.kind === 'batch' && (!next.summary || next.summary.title !== '가게 안내 기록' || next.summary.createdAt !== '2025-12-30T00:00:00.000Z' || !/^[a-f0-9]{64}$/.test(next.summary.sourceSha256) || next.summary.sourceSha256 !== next.example.change?.entries?.[0]?.sourceSha256)) throw new Error('unavailable');
      if (digest !== next.changeDigest || (record && (record.kind !== next.kind || record.canonical !== next.canonical || record.changeDigest !== next.changeDigest || record.permissionDigest !== next.permissionDigest))) throw new Error('unavailable');
      setRecord(next);
    } catch { setError('unavailable'); } finally { inFlight.current = false; setBusy(false); }
  }, [proposalId, record]);
  const initial = useRef(request);
  useEffect(() => { void initial.current(); }, []);
  return <section className="library-register" aria-label="발행 내용 확인" aria-busy={busy}>
    {record?.state === 'executed' && !error ? <p role="status">변경 결과를 확인했습니다.</p> : <>
      {error && <p role="alert">변경 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.</p>}
      {error === 'sign-in-required' && <form action="/api/fixture/object-reauth" method="post"><input type="hidden" name="proposalId" value={proposalId} /><Button profile="library" type="submit">다시 로그인</Button></form>}
      <Button profile="library" variant="ghost" type="button" disabled={busy} onClick={() => void request()}>최신 상태 다시 불러오기</Button>
      {!error && record && <>
        {record.kind === 'batch' && record.summary && <section className="staff-section" aria-label="이관 대상"><h2>이관 대상</h2><ul><li><strong>{record.summary.title}</strong><p>{new Date(record.summary.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {record.summary.sourceSha256}</p></li></ul></section>}
        <section className="staff-section" aria-labelledby="confirmation-summary"><h2 id="confirmation-summary">제안 내용</h2><dl>
          <dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>{escapeConfirmationText(record.example.operation)}</dd><dt>대상</dt><dd style={{ overflowWrap: 'anywhere' }}>library:{escapeConfirmationText(record.example.target)}</dd>
          <dt>제안 번호</dt><dd>{escapeConfirmationText(proposalId)}</dd><dt>제안 만료</dt><dd>{new Date(record.expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)</dd>
          <dt>현재 권한</dt><dd>이 대상의 작업 권한 확인됨 · {new Date(record.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)</dd><dt>처리 상태</dt><dd role="status">{record.state === 'approved' ? '확인됨 · 아직 실행되지 않음' : '확인 대기'}</dd>
          <dt>제안 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>{record.changeDigest}</dd><dt>권한 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>{record.permissionDigest}</dd>
        </dl><p>보이지 않는 문자는 {'\\uXXXX'} 또는 {'\\u{XXXXX}'}, 원래 역슬래시는 {'\\\\'}로 표시합니다. 검증에 사용하는 원문과 digest는 바꾸지 않습니다.</p><h3>실제 변경 데이터</h3><pre style={preStyle}>{confirmationPayloadText(record.example.change)}</pre><h3>서버에 저장된 제안 원문</h3><pre style={preStyle}>{escapeConfirmationText(record.canonical)}</pre></section>
        {record.kind === 'batch' && record.state === 'loaded' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('apply')}>이관 확인 및 적용</Button>}
        {record.kind === 'single' && record.state === 'loaded' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('review')}>제안 검토</Button>}
        {record.kind === 'single' && record.state === 'reviewed' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('confirm')}>이 변경 확인</Button>}
        {record.kind === 'single' && record.state === 'approved' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('execute')}>변경 적용</Button>}
      </>}
    </>}
  </section>;
}
