import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import './portal-button.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Library > 로그인' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const value = (await searchParams).next;
  const next = value === '/confirmations/proposal-01' ? value : '/';
  if (fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(next);
  return <div className="public-login-frame"><main className="login-screen"><section className="login-screen__content" aria-label="Library 로그인"><div className="login-screen__workspace">
    <a href="http://127.0.0.1:3825/" className="login-portal-button" aria-label="포털로 돌아가기"><span className="login-portal-button__art" aria-hidden="true">빈타제</span><span className="login-portal-button__overlay" aria-hidden="true">포털로 돌아가기</span></a>
    <form action="/api/fixture/login" method="post" className="login-screen__form"><input type="hidden" name="next" value={next} /><button className="google-signin-button" type="submit"><span>회사 계정으로 로그인</span></button></form>
  </div></section></main></div>;
}
