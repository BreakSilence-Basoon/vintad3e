import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { fixtureOrigin, fixtureSession } from './fixture-session.mjs';
import { PartnersTopbar } from './fixture-staff-topbar';

export async function FixtureStaffShell({ children }: { children: ReactNode }) {
  const origin = fixtureOrigin(process.env), requestHeaders = origin ? await headers() : null;
  const signedIn = origin && requestHeaders && fixtureSession(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env);
  return <div className="partners-staff-shell">{signedIn && <PartnersTopbar email="staff01@example.invalid" />}<div className="partners-staff-shell__content">{children}</div><footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></div>;
}
