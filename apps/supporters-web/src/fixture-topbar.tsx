'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { GtmHeaderNav } from './fixture-header-nav';

function FixtureAuth() {
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null), pathname = usePathname(), search = useSearchParams().toString();
  const returnTo = pathname === '/sign-in' ? '/' : `${pathname}${search ? `?${search}` : ''}`;
  useEffect(() => {
    if (!confirming) return;
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !ref.current?.contains(event.target)) setConfirming(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirming(false); };
    const mobile = window.matchMedia('(max-width: 860px)');
    const resize = (event: MediaQueryListEvent) => { if (!event.matches) setConfirming(false); };
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape); mobile.addEventListener('change', resize);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); mobile.removeEventListener('change', resize); };
  }, [confirming]);
  return <div className={`topbar__auth${confirming ? ' is-confirming' : ''}`} ref={ref}><Link href={`/sign-in?mode=cover&next=${encodeURIComponent(returnTo)}`} className="topbar__identity" aria-label="로그인 전 화면 보기" title="로그인 전 화면 보기"><span className="topbar__identity-email-full">staff01@example.invalid</span><span className="topbar__identity-email-mobile" aria-hidden="true">staff01@example.invalid</span></Link>
    <form action="/api/fixture/logout" method="post" onSubmit={event => { if (window.matchMedia('(max-width: 860px)').matches && !confirming) { event.preventDefault(); setConfirming(true); } }}><Button type="submit" variant="ghost" size="small" appearanceSlot="topbar-logout" aria-label={confirming ? '로그아웃 하시겠습니까?' : '로그아웃'}><span className="topbar__logout-label" aria-hidden={confirming}>로그아웃</span><svg className="topbar__logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8.5 18 12l-3.5 3.5M9 12h9" /></svg><span className="topbar__logout-confirm" aria-hidden={!confirming}>로그아웃 하시겠습니까?</span></Button></form>
  </div>;
}
export function FixtureTopbar({ role }: { role: 'admin' | 'viewer' }) {
  return <header className="topbar"><div className="topbar__inner"><div className="topbar__brand-group"><Link href="/" className="topbar__brand-link" aria-label="홈으로 이동" title="홈"><svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" /></svg></Link></div><GtmHeaderNav role={role} variant="desktop" /><div className="topbar__controls"><FixtureAuth /></div><GtmHeaderNav role={role} variant="mobile" /></div></header>;
}
