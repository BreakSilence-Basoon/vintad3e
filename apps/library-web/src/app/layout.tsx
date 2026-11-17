import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/library.css';
import '../library-original.css';
export const metadata = { title: '침깨 > Library' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="ko"><body>{children}<footer className="public-footer"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></body></html>; }
