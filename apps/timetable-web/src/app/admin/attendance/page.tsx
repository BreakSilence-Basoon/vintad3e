import { notFound } from 'next/navigation';
import { FixtureAttendanceAdmin } from '../../../fixture-attendance-admin';
import '../../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > 출퇴근 기록' };
export default function Page() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1' || process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN !== '1') notFound();
  return <FixtureAttendanceAdmin />;
}
