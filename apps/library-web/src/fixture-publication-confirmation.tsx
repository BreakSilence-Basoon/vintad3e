'use client';
import { useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import Link from 'next/link';

const key = 'vintad3e-library-fixture-published-01';

export function FixturePublicationConfirmation() {
  const [state, setState] = useState<'loaded' | 'reviewed' | 'approved' | 'published'>('loaded');
  return <section className="library-register" aria-label="발행 내용 확인">
    {state === 'published' ? <><p role="status">문서 발행 결과를 확인했습니다.</p><Link href="/publications/00000000-0000-4000-8000-000000000004">발행한 문서 열기</Link></> : <>
      <Button profile="library" variant="ghost" type="button" onClick={() => setState('loaded')}>최신 상태 다시 불러오기</Button>
      <section className="staff-section"><h2>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>문서 발행</dd><dt>제안 번호</dt><dd>proposal-01</dd><dt>처리 상태</dt><dd role="status">{state === 'approved' ? '확인됨 · 아직 실행되지 않음' : '확인 대기'}</dd></dl><h3>실제 변경 데이터</h3><pre>{'{"title":"업무 안내"}'}</pre><h3>서버에 저장된 제안 원문</h3><pre>{'{"title":"업무 안내"}'}</pre></section>
      {state === 'loaded' && <Button profile="library" variant="primary" type="button" onClick={() => setState('reviewed')}>제안 검토</Button>}
      {state === 'reviewed' && <Button profile="library" variant="primary" type="button" onClick={() => setState('approved')}>이 변경 확인</Button>}
      {state === 'approved' && <Button profile="library" variant="primary" type="button" onClick={() => { try { sessionStorage.setItem(key, 'published'); setState('published'); } catch { /* A failed write must not report publication. */ } }}>문서 발행</Button>}
    </>}
  </section>;
}
