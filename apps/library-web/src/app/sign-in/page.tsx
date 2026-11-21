import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureNext, fixtureOrigin, fixtureSession, fixtureResumePath } from '../../fixture-session.mjs';
import { fixtureSignInNotice } from '../../fixture-sign-in-notice.mjs';
import { FixtureSignInToast } from '../../fixture-sign-in-toast';
import '@vintad3e/ui/styles/toast.css';
import './portal-button.css';
import './sign-in-toast.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Library > 로그인' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; mode?: string | string[]; error?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const query = await searchParams, value = Array.isArray(query.next) ? query.next[0] : query.next;
  const notice = fixtureSignInNotice(Array.isArray(query.error) ? query.error[0] : query.error);
  const signedIn = fixtureSession(requestHeaders.get('cookie'), host, process.env);
  const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const cover = signedIn && mode === 'cover';
  const next = cover ? fixtureResumePath(value) : fixtureNext(value);
  if (signedIn && !cover) redirect(next);
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-label="Library 로그인"><div className="login-screen__workspace">
    <a href="http://127.0.0.1:3825/" className="login-portal-button" aria-label="포털로 돌아가기"><span className="login-portal-button__art" aria-hidden="true">빈타제</span><span className="login-portal-button__overlay" aria-hidden="true">포털로 돌아가기</span></a>
    {cover ? <div className="login-screen__form"><Link href={next} className="staff-signin-button login-screen__return-link"><span>Library로 돌아가기</span></Link></div> : <form action="/api/fixture/login" method="post" className="login-screen__form"><input type="hidden" name="next" value={next} /><button className="google-signin-button" type="submit"><span>회사 계정으로 로그인</span></button></form>}
  </div></section></main>{notice && <FixtureSignInToast notice={notice} />}</div>;
}
