import Link from 'next/link';
import { headers } from 'next/headers';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/staff-web.css';
import '../staff-original.css';
export const metadata = { title: '빈타제 > Creative' };
export default async function Layout({ children }: { children: ReactNode }) {
  const origin = fixtureOrigin(process.env), requestHeaders = origin ? await headers() : null;
  const signedIn = requestHeaders ? fixtureSession(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env) : false;
  return <html lang="ko"><body>{signedIn && <header className="topbar"><div className="topbar__inner"><div className="topbar__brand-group"><Link href="/" className="topbar__brand-link" aria-label="Creative 홈으로 이동" title="홈"><svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" /></svg></Link></div><div className="topbar__controls"><div className="topbar__auth"><Link href="/sign-in?mode=cover&next=%2F" className="topbar__identity" aria-label="staff01@example.invalid 로그인 화면 보기" title="로그인 화면 보기"><span>staff01@example.invalid</span></Link><form action="/api/fixture/logout" method="post"><button type="submit" className="button button--ghost button--small">로그아웃</button></form></div></div></div></header>}{children}<footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></body></html>; }
