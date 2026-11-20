'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';

const items = [{ href: '/permissions', label: '계정 권한' }, { href: '/permissions/apps', label: '앱 접근' }, { href: '/audit', label: '변경 이력' }];

function Auth() {
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
  return <div className={`topbar__auth${confirming ? ' is-confirming' : ''}`} ref={ref}>
    <Link href={`/sign-in?mode=cover&next=${encodeURIComponent(returnTo)}`} className="topbar__identity" aria-label="로그인 전 화면 보기" title="로그인 전 화면 보기"><span className="topbar__identity-email-full">staff01@example.invalid</span><span className="topbar__identity-email-mobile" aria-hidden="true">staff01@example.invalid</span></Link>
    <form action="/api/fixture/logout" method="post" onSubmit={event => { if (window.matchMedia('(max-width: 860px)').matches && !confirming) { event.preventDefault(); setConfirming(true); } }}>
      <Button profile="timetable" type="submit" variant="ghost" size="small" appearanceSlot="topbar-logout" aria-label={confirming ? '로그아웃 하시겠습니까?' : '로그아웃'}><span className="topbar__logout-label" aria-hidden={confirming}>로그아웃</span><svg className="topbar__logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8.5 18 12l-3.5 3.5M9 12h9" /></svg><span className="topbar__logout-confirm" aria-hidden={!confirming}>로그아웃 하시겠습니까?</span></Button>
    </form>
  </div>;
}

function HomeLink() { return <div className="topbar__brand-group"><Link href="/" className="topbar__brand-link" aria-label="Admin 홈으로 이동" title="홈"><svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" /></svg></Link></div>; }

export function FixtureAdminHeader() {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), path = usePathname();
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia('(max-width: 860px)');
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false); };
    const resize = (event: MediaQueryListEvent) => { if (!event.matches) setOpen(false); };
    document.addEventListener('pointerdown', outside); query.addEventListener('change', resize);
    return () => { document.removeEventListener('pointerdown', outside); query.removeEventListener('change', resize); };
  }, [open]);
  return <>
    <div className="admin-desktop-header"><header className="topbar"><div className="topbar__inner"><HomeLink /><nav className="topbar__nav" aria-label="메뉴">{items.map(item => <Link href={item.href} key={item.href} data-label={item.label} className={path === item.href ? 'is-active' : undefined} aria-current={path === item.href ? 'page' : undefined}><span>{item.label}</span></Link>)}</nav><div className="topbar__controls"><Auth /></div></div></header></div>
    <div className="admin-mobile-header"><header className="topbar"><div className="topbar__inner"><HomeLink /><div className="topbar__controls"><Auth /></div><div className="topbar__navigation topbar__navigation--mobile"><div className={`topbar__menu-backdrop${open ? ' is-open' : ''}`} aria-hidden="true" /><div ref={ref} className={`topbar__menu${open ? ' is-open' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); requestAnimationFrame(() => ref.current?.querySelector('button')?.focus()); } }}>
      <button type="button" aria-expanded={open} aria-controls="admin-mobile-navigation" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} title={open ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setOpen(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path className="topbar__menu-icon-bars" d="M4 7h16M4 12h16M4 17h16" /><path className="topbar__menu-icon-close" d="M6 6l12 12M18 6 6 18" /></svg></button>
      <nav id="admin-mobile-navigation" className="topbar__mobile-nav" aria-label="모바일 메뉴" aria-hidden={!open}><svg className="topbar__menu-bridge" viewBox="0 0 50 46" aria-hidden="true"><path d="M0 30 C14 30 19 27 24 22 L29 17 C33 12 34 7 34 0 H50 V12 C50 20 46 26 40 31 C35 35 33 40 33 46 H0 Z" /></svg>{items.map(item => <Link key={item.href} href={item.href} className={path === item.href ? 'is-active' : undefined} aria-current={path === item.href ? 'page' : undefined} tabIndex={open ? undefined : -1} onClick={() => setOpen(false)}><span>{item.label}</span></Link>)}</nav>
    </div></div></div></header></div>
  </>;
}
