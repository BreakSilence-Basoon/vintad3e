import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/staff-web.css';
import '@vintad3e/ui/styles/tokens.css';
import '../staff-original.css';
import '../globals.css';
import '../admin-screens.css';
export const metadata = { title: '빈타제 > Admin > 구성원' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="ko"><body>{children}<footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></body></html>; }
