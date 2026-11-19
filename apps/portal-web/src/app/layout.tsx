import type { ReactNode } from 'react';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/staff-web.css';
import '../staff-original.css';
import '../portal-original.css';

export const metadata = { title: '빈타제' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
