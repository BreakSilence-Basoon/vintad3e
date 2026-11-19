import { notFound } from 'next/navigation';
import { FixtureKioskAdmin } from '../../../fixture-kiosk-view';
import '../../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > QR 관리' };
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1' || process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN !== '1') notFound();
  const value = (await searchParams).view;
  const view = Array.isArray(value) ? value[0] : value;
  return <FixtureKioskAdmin initialView={view === 'devices' ? 'devices' : 'qr'} />;
}
