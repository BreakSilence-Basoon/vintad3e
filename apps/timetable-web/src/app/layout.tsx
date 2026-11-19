import type { ReactNode } from 'react';
import { TimetableTopbar } from '../timetable-topbar';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/timetable.css';
import '../timetable-slide-switcher.css';
import '../schedule-original.css';
import '../schedule-detail-original.css';
import '../attendance-original.css';
import '../attendance-history-editor-original.css';
import '../attendance-history-card-original.css';
import '../header-original.css';
import './page.css';

export const metadata = { title: '빈타제 | Timetable' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body><TimetableTopbar />{children}</body></html>;
}
