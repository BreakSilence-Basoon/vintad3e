import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/staff-web.css';
import '../staff-original.css';
export const metadata = { title: '침깨 > Creative' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="ko"><body>{children}<footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></body></html>; }
