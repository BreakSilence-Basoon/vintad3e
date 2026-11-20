import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { StaffToastViewport } from '@vintad3e/ui/toast';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { FixtureTopbar } from '../fixture-topbar';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/toast.css';
import '@vintad3e/ui/styles/tokens.css';
import '../supporters-original.css';
export const metadata = { title: '빈타제 > Supporters > 쿠폰' };
export default async function Layout({ children }: { children: ReactNode }) {
  const origin = fixtureOrigin(process.env), h = origin ? await headers() : null, host = h?.get('host') ?? null;
  const signedIn = origin && h && fixtureSession(h.get('cookie'), host, process.env);
  const role = process.env.VINTAD3E_SUPPORTERS_FIXTURE_SELF === '1' ? 'viewer' : 'admin';
  return <html lang="ko"><body><div className="supporters-page-content">{signedIn && <Suspense fallback={null}><FixtureTopbar role={role} /></Suspense>}{children}</div><footer className="public-footer" aria-label="공개 페이지 링크"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p><nav className="public-footer__nav" aria-label="법적 고지 / Legal"><Link href="/terms" aria-label="이용약관 · Terms · 利用規約"><span className="public-footer__label-full">이용약관 · Terms · 利用規約</span><span className="public-footer__label-short" aria-hidden="true">이용약관</span></Link><Link href="/privacy" aria-label="개인정보처리방침 · Privacy · プライバシー"><span className="public-footer__label-full">개인정보처리방침 · Privacy · プライバシー</span><span className="public-footer__label-short" aria-hidden="true">개인정보처리방침</span></Link></nav></div></footer><StaffToastViewport /></body></html>;
}
