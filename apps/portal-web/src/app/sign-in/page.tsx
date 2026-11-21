import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { fixtureNext, fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import { fixtureSignInNotice } from '../../fixture-sign-in-notice.mjs';
import { FixtureSignInToast } from '../../fixture-sign-in-toast';
import '@vintad3e/ui/styles/toast.css';
import './sign-in-toast.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > 로그인' };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; mode?: string | string[]; error?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const params = await searchParams;
  const value = params.next;
  const next = fixtureNext(Array.isArray(value) ? value[0] : value);
  const signedIn = fixtureSession(requestHeaders.get('cookie'), host, process.env);
  const cover = signedIn && (Array.isArray(params.mode) ? params.mode[0] : params.mode) === 'cover';
  const notice = cover ? null : fixtureSignInNotice(Array.isArray(params.error) ? params.error[0] : params.error);
  if (signedIn && !cover) redirect(next);
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-labelledby="sign-in-title"><div className="login-screen__workspace"><h1 id="sign-in-title" className="login-screen__app-name">빈타제</h1>{cover ? <div className="login-screen__form"><Link href={next} className="staff-signin-button login-screen__return-link"><span>빈타제로 돌아가기</span></Link></div> : <form action="/api/fixture/login" method="post" className="login-screen__form"><input type="hidden" name="next" value={next} /><button className="staff-signin-button" type="submit"><span>회사 계정으로 로그인</span></button></form>}</div></section></main>{notice && <FixtureSignInToast notice={notice} />}</div>;
}
