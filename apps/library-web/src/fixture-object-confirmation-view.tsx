'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { fixtureUploads } from './fixture-upload-spec.mjs';

type RecordView = { proposalId: string; objectId: string; state: 'loaded' | 'reviewed' | 'confirmed'; expiresAt: number };
export function FixtureObjectConfirmation({ proposalId }: { proposalId: string }) {
  const [record, setRecord] = useState<RecordView | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(true);
  const inFlight = useRef(false);
  const request = useCallback(async (action?: 'review' | 'confirm') => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      let response = await fetch(action ? '/api/fixture/object-confirmation' : `/api/fixture/object-confirmation?proposalId=${encodeURIComponent(proposalId)}`, {
        method: action ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: action ? { 'content-type': 'application/json' } : {}, ...(action ? { body: JSON.stringify({ action, proposalId }) } : {}), signal: AbortSignal.timeout(15000),
      });
      if (!action && response.status === 404) {
        const proof = sessionStorage.getItem(`vintad3e-library-object-recovery:${proposalId}`);
        if (proof && /^[A-Za-z0-9_-]{43}$/.test(proof)) response = await fetch('/api/fixture/object-confirmation', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'restore', proposalId, proof }), signal: AbortSignal.timeout(15000) });
      }
      if (response.status === 401) { setError('sign-in-required'); return; }
      const next = response.ok ? await response.json() : null;
      if (!next || next.proposalId !== proposalId || !fixtureUploads.some(item => item.id === next.objectId) || !['loaded', 'reviewed', 'confirmed'].includes(next.state) || !Number.isFinite(next.expiresAt) || next.expiresAt <= Date.now()) throw new Error('unavailable');
      if (record && next.objectId !== record.objectId) throw new Error('unavailable');
      setRecord(next);
    } catch { setError('unavailable'); }
    finally { inFlight.current = false; setBusy(false); }
  }, [proposalId, record]);
  const initialRequest = useRef(request);
  useEffect(() => { void initialRequest.current(); }, []);
  const object = record && fixtureUploads.find(item => item.id === record.objectId);
  return <section className="library-register" aria-label="업로드 내용 확인" aria-busy={busy}>
    {error && <p role="alert">내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.</p>}
    {error === 'sign-in-required' && <form action="/api/fixture/object-reauth" method="post"><input type="hidden" name="proposalId" value={proposalId} /><Button profile="library" type="submit">다시 로그인</Button></form>}
    <Button profile="library" variant="ghost" type="button" disabled={busy} onClick={() => void request()}>최신 상태 다시 불러오기</Button>
    {!error && record && object && <>
      <section className="staff-section"><h2>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>파일 올리기</dd><dt>대상</dt><dd>{object.filename}</dd></dl></section>
      {record.state === 'loaded' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('review')}>제안 검토</Button>}
      {record.state === 'reviewed' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void request('confirm')}>이 변경 확인</Button>}
    </>}
  </section>;
}
