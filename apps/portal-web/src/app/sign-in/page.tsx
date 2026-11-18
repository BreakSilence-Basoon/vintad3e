import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: '침깨 > 로그인' };
export default async function Page() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/');
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-labelledby="sign-in-title"><div className="login-screen__workspace"><h1 id="sign-in-title" className="login-screen__app-name">빈타제</h1><form action="/api/fixture/login" method="post" className="login-screen__form"><button className="staff-signin-button" type="submit"><span>회사 계정으로 로그인</span></button></form></div></section></main></div>;
}
