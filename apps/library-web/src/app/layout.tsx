import { headers } from 'next/headers';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { LibraryTopbarFixture } from '../library-topbar-fixture';
import '../library-topbar-original.css';
import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/library.css';
import '../library-original.css';
export const metadata = { title: '빈타제 > Library' };
export default async function Layout({ children }: { children: ReactNode }) { const origin=fixtureOrigin(process.env), h=origin?await headers():null; const signedIn=h?fixtureSession(h.get('cookie'),h.get('host'),process.env):false; return <html lang="ko"><body>{signedIn && <LibraryTopbarFixture />}{children}<footer className="public-footer"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></body></html>; }
