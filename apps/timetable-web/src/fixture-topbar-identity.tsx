'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export function FixtureTopbarIdentity() {
  const pathname = usePathname(), query = useSearchParams().toString();
  const next = pathname === '/sign-in' ? '/' : `${pathname}${query ? `?${query}` : ''}`;
  return <Link href={`/sign-in?mode=cover&next=${encodeURIComponent(next)}`} className="topbar__identity" aria-label="로그인 전 화면 보기, staff01@example.invalid" title="로그인 전 화면 보기"><span className="topbar__identity-email-full">staff01@example.invalid</span><span className="topbar__identity-email-mobile" aria-hidden="true">staff01@example.invalid</span></Link>;
}
