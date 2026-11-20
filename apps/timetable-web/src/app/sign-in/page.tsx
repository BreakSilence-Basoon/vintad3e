import './login-original.css';
import Link from 'next/link';
import { headers } from 'next/headers';
import { fixtureCoverNext, fixtureNext, fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';

export const metadata = { title: '빈타제 > Timetable > 로그인' };
type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export default async function SignInPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const fixture = Boolean(fixtureOrigin(process.env)) && !process.env.VINTAD3E_TIMETABLE_API_ORIGIN;
  const h = fixture ? await headers() : null;
  const signedIn = Boolean(h && fixtureSession(h.get('cookie'), h.get('host'), process.env));
  const cover = signedIn && params.mode === 'cover';
  const portal = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3825/' : undefined;
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-label="직원 로그인"><div className="login-screen__workspace">
    <a href={portal} className="login-portal-button" aria-label="포털로 돌아가기"><span className="login-portal-button__art" aria-hidden="true">빈타제</span><span className="login-portal-button__overlay" aria-hidden="true">포털로 돌아가기</span></a>
    {cover ? <div className="login-screen__form"><Link href={fixtureCoverNext(next)} className="google-signin-button login-screen__return-link"><span>Timetable로 돌아가기</span></Link></div> : <form action={fixture ? '/api/fixture/login' : '/auth/start'} method={fixture ? 'post' : 'get'} className="login-screen__form"><input type="hidden" name="next" value={fixture ? fixtureNext(next) : next || '/'} /><button type="submit" className="google-signin-button"><span>회사 계정으로 로그인</span></button></form>}
  </div></section></main></div>;
}
