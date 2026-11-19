import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { bedroomFixture } from '../../../../bedroom-fixture';
import { seoulDate } from '../../../../partner-schedule';
import { guestOrigin, guestSession } from '../../../../guest-session.mjs';
import '../../../../guest-shell-original.css';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ area: string; partner: string }> }) {
  const { area, partner } = await params;
  if (area !== 'proj-bedroom') notFound();
  const fixture = bedroomFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()), partner);
  const origin = guestOrigin(process.env);
  if (!fixture || !origin) notFound();
  const requestHeaders = await headers();
  if (requestHeaders.get('host') !== new URL(origin).host) notFound();
  const signedIn = guestSession(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env, partner);
  return <div className="guest-preview-shell"><main className="login-screen guest-preview-login"><section className="login-screen__content" aria-labelledby="guest-sign-in-title"><div className="login-screen__workspace"><h1 id="guest-sign-in-title" className="sr-only">{fixture.partner.name}</h1><Link href="/proj-bedroom/guide/ko" aria-label="작가 브리프"><img src="/icon.svg" alt="" width="220" height="220" /></Link>
    {signedIn ? <div className="login-screen__form"><Link href={`/proj-bedroom/${partner}/guest`} className="staff-signin-button login-screen__return-link">{fixture.partner.name} 화면으로 돌아가기</Link></div> : <form className="login-screen__form" method="post" action={`/proj-bedroom/${partner}/session/login`}><button className="staff-signin-button" type="submit">게스트 계정으로 로그인하기</button></form>}
  </div></section></main><footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></div>;
}
