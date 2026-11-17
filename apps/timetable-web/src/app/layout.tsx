import type { ReactNode } from 'react';
import '../timetable-slide-switcher.css';
import '../schedule-original.css';
import './page.css';

export const metadata = { title: '빈타제 | Timetable' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
