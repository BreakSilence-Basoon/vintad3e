import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@vintad3e/ui/components';

export function FixturePortalTopbar() {
  return <header className="topbar portal-topbar"><div className="topbar__inner"><div className="topbar__brand-group"><Link href="/" className="portal-brand" aria-label="빈타제 홈으로 이동"><Image src="/icon.svg" alt="" width={44} height={44} unoptimized className="portal-brand__icon" /><span className="topbar__brand">빈타제</span></Link></div><div className="topbar__controls"><div className="topbar__auth"><Link href="/sign-in?mode=cover&next=%2F" className="topbar__identity" aria-label="staff01@example.invalid 로그인 화면 보기" title="로그인 화면 보기"><span>staff01@example.invalid</span></Link><form action="/api/fixture/logout" method="post"><Button variant="ghost" size="small" profile="timetable" type="submit">로그아웃</Button></form></div></div></div></header>;
}
