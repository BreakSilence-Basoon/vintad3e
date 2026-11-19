import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Floor > Floor를 사용할 수 없습니다' };

export default async function AccessDeniedPage() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in');
  return <main className="state-page"><section className="state-panel">
    <h1>Floor를 사용할 수 없습니다.</h1><p>등록된 직원 계정인지 확인한 뒤 관리자에게 문의해주세요.</p>
    <form action="/api/fixture/logout" method="post"><button type="submit" className="button button--primary">다른 Google 계정으로 로그인</button></form>
  </section></main>;
}
