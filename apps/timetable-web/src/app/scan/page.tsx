import { notFound, redirect } from 'next/navigation';
import { FixtureScanner } from '../../fixture-scanner';
import '../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > QR 코드 스캔' };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1') notFound();
  if ((await searchParams).token) redirect('/scan');
  return <main className="employee-scan-page"><FixtureScanner /></main>;
}
