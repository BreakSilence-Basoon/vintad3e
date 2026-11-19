import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureNext, fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > 로그인' };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const value = (await searchParams).next;
  const next = fixtureNext(Array.isArray(value) ? value[0] : value);
  if (fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(next);
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-labelledby="sign-in-title"><div className="login-screen__workspace"><h1 id="sign-in-title" className="login-screen__app-name">빈타제</h1><form action="/api/fixture/login" method="post" className="login-screen__form"><input type="hidden" name="next" value={next} /><button className="staff-signin-button" type="submit"><span>회사 계정으로 로그인</span></button></form></div></section></main></div>;
}
