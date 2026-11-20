import Link from 'next/link';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { Button } from '@vintad3e/ui/components';
import { TimetableNav } from './timetable-nav';
import { fixtureOrigin, fixtureSession } from './fixture-session.mjs';
import { FixtureTopbarIdentity } from './fixture-topbar-identity';

// Original Timetable header for the signed-out state; no identity is fabricated.
export async function TimetableTopbar() {
  const origin = !process.env.VINTAD3E_TIMETABLE_API_ORIGIN ? fixtureOrigin(process.env) : null;
  const h = origin ? await headers() : null;
  const signedIn = Boolean(origin && h && fixtureSession(h.get('cookie'), h.get('host'), process.env));
  const isAdmin = signedIn && process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN === '1';
  return <header className="topbar"><div className="topbar__inner"><div className="topbar__brand-group">
    <Link href={signedIn ? '/' : '/?view=history'} className="topbar__brand-link" aria-label="Timetable 홈으로 이동" title="홈">
      <svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" />
      </svg>
    </Link>
  </div>{signedIn && <TimetableNav isAdmin={isAdmin} variant="desktop" />}{signedIn && <div className="topbar__controls"><div className="topbar__auth"><div className="topbar__account-row"><Link href="/scan" className="topbar__scan-link" aria-label="QR 코드 스캔" title="QR 코드 스캔"><svg className="topbar__scan-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.2 6.5 9.6 4.7h4.8l1.4 1.8h2.7A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5V9a2.5 2.5 0 0 1 2.5-2.5h2.7Z" /><circle cx="12" cy="13" r="3.6" /></svg></Link><Suspense fallback={null}><FixtureTopbarIdentity /></Suspense></div><form action="/api/fixture/logout" method="post"><Button type="submit" variant="ghost" size="small" profile="timetable" aria-label="로그아웃"><span className="topbar__logout-label">로그아웃</span><svg className="topbar__logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8.5 18 12l-3.5 3.5M9 12h9" /></svg></Button></form></div></div>}{signedIn && <TimetableNav isAdmin={isAdmin} variant="mobile" />}</div></header>;
}
