import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 이 계정으로는 관리 화면을 열 수 없습니다' };

export default async function AccessDeniedPage() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const signedIn = fixtureSession(requestHeaders.get('cookie'), host, process.env);
  return <main className="shell shell--dashboard"><section className="hero hero--compact">
    <div className="hero__copy"><h1>이 계정으로는 관리 화면을<br />열 수 없습니다</h1>
      <p className="hero__description">현재 로그인한 계정은 홈 화면 조회까지만 허용된 상태입니다. 관리자 계정으로 다시 로그인하거나, 관리자 허용 목록에 이 계정을 추가해야 합니다.</p>
      <div className="hero__badges"><span className="helper-pill">현재 권한: viewer</span><span className="helper-pill">{signedIn ? 'viewer@example.invalid' : '로그인 필요'}</span></div>
    </div>
    <aside className="hero__panel card"><h2>다음으로 할 일</h2><p className="card__description">조회만 필요한 직원이면 홈으로 돌아가면 되고, 관리자 작업이 필요하면 관리자 계정으로 다시 로그인하면 됩니다.</p>
      <div className="button-row"><Link className="button button--primary" href="/">홈으로 이동</Link><form action="/api/fixture/logout" method="post"><button type="submit" className="button button--ghost">다른 계정으로 로그인</button></form></div>
    </aside>
  </section></main>;
}
