'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';

const read = () => { try { return sessionStorage.getItem('vintad3e-library-fixture-published-01') === 'published'; } catch { return false; } };
const subscribe = () => () => {};

export function FixturePublishedDocument() {
  const published = useSyncExternalStore(subscribe, read, () => false);
  if (!published) return <main className="library-home"><section className="library-page"><p>문서를 찾을 수 없습니다.</p><Link href="/">홈</Link></section></main>;
  return <main className="library-home"><section className="library-page"><nav><Link href="/">홈</Link></nav><header className="library-page__header"><h1>업무 안내</h1></header><article className="publication-content"><p>업무를 시작하기 전에 필요한 사항을 확인합니다.</p></article></section></main>;
}
