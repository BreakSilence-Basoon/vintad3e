import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { FixtureScanner } from '../../fixture-scanner';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import '../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > QR 코드 스캔' };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1') notFound();
  if ((await searchParams).token) redirect('/scan');
  const origin = fixtureOrigin(process.env);
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (!origin || host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fscan');
  return <main className="employee-scan-page"><FixtureScanner /></main>;
}
