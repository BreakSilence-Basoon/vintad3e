import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { FixtureAttendanceAdmin } from '../../../fixture-attendance-admin';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import '../../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > 출퇴근 기록' };
export default async function Page() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1' || process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN !== '1') notFound();
  const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
  if (!origin || host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fadmin%2Fattendance');
  return <FixtureAttendanceAdmin />;
}
