'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@vintad3e/ui/components';
import { partnerAreas } from './partner-schedule';

function IdentitySurface({ email, href }: { email: string; href: string }) {
  const mobileEmail = email.toLowerCase().endsWith('@gmail.com') ? email.slice(0, -'@gmail.com'.length) : email;
  return <Link href={href} className="topbar__identity" aria-label={`${email} 로그인 전 화면 보기`} title={email}>
    <span className="topbar__identity-email-full">{email}</span>
    <span className="topbar__identity-email-mobile" aria-hidden="true">{mobileEmail}</span>
  </Link>;
}
function Identity({ email }: { email: string }) {
  const pathname = usePathname(), params = useSearchParams();
  const returnTo = pathname === '/sign-in' ? '/' : `${pathname}${params.size ? `?${params}` : ''}`;
  return <IdentitySurface email={email} href={`/sign-in?mode=cover&next=${encodeURIComponent(returnTo)}`} />;
}
function Logout({ pending }: { pending: boolean }) {
  return <Button type="submit" variant="ghost" size="small" disabled={pending} aria-busy={pending} aria-label={pending ? '로그아웃 중…' : '로그아웃'}>
    <span className="form-submit-button__content"><span className="form-submit-button__measure topbar__logout-label" aria-hidden="true">로그아웃 중…</span><span className="form-submit-button__visible"><span className="topbar__logout-label">{pending ? '로그아웃 중…' : '로그아웃'}</span><svg className="topbar__logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8.5 18 12l-3.5 3.5M9 12h9" /></svg></span></span>
  </Button>;
}
export function PartnersTopbar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(max-width: 640px)');
    const close = () => menuRef.current?.removeAttribute('open');
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menuRef.current?.contains(event.target)) close(); };
    const resize = (event: MediaQueryListEvent) => { if (!event.matches) close(); };
    document.addEventListener('pointerdown', outside);
    media.addEventListener('change', resize);
    return () => { document.removeEventListener('pointerdown', outside); media.removeEventListener('change', resize); };
  }, [open]);
  if (pathname === '/sign-in' || pathname === '/signed-out') return null;
  function links(close = false) {
    return <>{partnerAreas.map(area => {
      const active = pathname === area.href || pathname.startsWith(`${area.href}/`) || (area.id === 'proj-bedroom' && pathname.startsWith('/showroom/'));
      return <Link key={area.id} href={area.href} data-label={area.label} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined} onClick={close ? () => menuRef.current?.removeAttribute('open') : undefined}><span>{area.label}</span></Link>;
    })}<Link href="/accounts" data-label="계정 추가" className={pathname === '/accounts' ? 'is-active' : undefined} aria-current={pathname === '/accounts' ? 'page' : undefined} onClick={close ? () => menuRef.current?.removeAttribute('open') : undefined}><span>계정 추가</span></Link></>;
  }
  return <header className="topbar"><div className="topbar__inner">
    <div className="topbar__brand-group"><Link href="/" className="topbar__brand-link" aria-label="Partners 홈으로 이동" aria-current={pathname === '/' ? 'page' : undefined} title="홈"><svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" /></svg></Link></div>
    <div className="topbar__navigation topbar__navigation--desktop"><nav className="topbar__nav" aria-label="Partners 메뉴">{links()}</nav></div>
    <div className="topbar__controls"><div className="topbar__auth">
      {email ? <Suspense fallback={<IdentitySurface email={email} href="/sign-in?mode=cover&next=%2F" />}><Identity email={email} /></Suspense> : null}
      <form action="/api/fixture/logout" method="post" onSubmit={() => setPending(true)}><Logout pending={pending} /></form>
    </div></div>
    <div className="topbar__navigation topbar__navigation--mobile"><details className="topbar__menu" ref={menuRef} onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); menuRef.current?.removeAttribute('open'); requestAnimationFrame(() => menuRef.current?.querySelector('summary')?.focus()); }
    }}><summary aria-label="메뉴" title="메뉴"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg></summary><nav className="topbar__mobile-nav" aria-label="Partners 모바일 메뉴">{links(true)}</nav></details></div>
  </div></header>;
}
