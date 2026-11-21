'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import Link from 'next/link';

const key = 'vintad3e-library-fixture-published-01';
const failureCodes = new Set(['sign-in-required', 'session-revoked', 'denied', 'changed', 'invalid-request', 'unavailable']);

export function FixturePublicationConfirmation() {
  const [state, setState] = useState<'loaded' | 'reviewed' | 'approved' | 'published'>('loaded');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const inFlight = useRef(false);
  const recover = useCallback(async (action?: 'review' | 'confirm' | 'publish') => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null && saved !== 'published') throw new Error('unavailable');
      const response = await fetch('/api/fixture/publication-confirmation', {
        method: action ? 'POST' : 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store',
        headers: action ? { accept: 'application/json', 'content-type': 'application/json' } : { accept: 'application/json' },
        ...(action ? { body: JSON.stringify({ action }) } : {}), signal: AbortSignal.timeout(15000),
      });
      const record = await response.json();
      if (!response.ok) { setError(typeof record?.error === 'string' && failureCodes.has(record.error) ? record.error : 'unavailable'); return; }
      if (!['loaded', 'reviewed', 'approved', 'published'].includes(record?.state) || !Number.isFinite(record?.expiresAt)) throw new Error('unavailable');
      if (record.state !== 'published' && Date.now() >= record.expiresAt) { setError('changed'); return; }
      if (record.state === 'published' && saved === null) sessionStorage.setItem(key, 'published');
      if (record.state !== 'published' && saved !== null) throw new Error('unavailable');
      setState(record.state);
    }
    catch { setError('unavailable'); }
    finally { inFlight.current = false; setBusy(false); }
  }, []);
  useEffect(() => { void recover(); }, [recover]);
  return <section className="library-register" aria-label="발행 내용 확인">
    {state === 'published' ? <><p role="status">문서 발행 결과를 확인했습니다.</p><Link href="/publications/00000000-0000-4000-8000-000000000004">발행한 문서 열기</Link></> : <>
      {error && <p role="alert">발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.</p>}
      {(error === 'sign-in-required' || error === 'changed') && <form action="/api/fixture/publication-reauth" method="post"><Button profile="library" type="submit">다시 로그인</Button></form>}
      <Button profile="library" variant="ghost" type="button" disabled={busy} onClick={() => void recover()}>최신 상태 다시 불러오기</Button>
      {!error && <>
      <section className="staff-section"><h2>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>문서 발행</dd><dt>제안 번호</dt><dd>proposal-01</dd><dt>처리 상태</dt><dd role="status">{state === 'approved' ? '확인됨 · 아직 실행되지 않음' : '확인 대기'}</dd></dl><h3>실제 변경 데이터</h3><pre>{'{"title":"업무 안내"}'}</pre><h3>서버에 저장된 제안 원문</h3><pre>{'{"title":"업무 안내"}'}</pre></section>
      {state === 'loaded' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void recover('review')}>제안 검토</Button>}
      {state === 'reviewed' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void recover('confirm')}>이 변경 확인</Button>}
      {state === 'approved' && <Button profile="library" variant="primary" type="button" disabled={busy} onClick={() => void recover('publish')}>문서 발행</Button>}
      </>}
    </>}
  </section>;
}
