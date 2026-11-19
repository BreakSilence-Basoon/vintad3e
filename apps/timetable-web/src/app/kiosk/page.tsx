import { notFound } from 'next/navigation';
import { FixtureKioskBoard } from '../../fixture-kiosk-view';
import '../../kiosk-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > 출퇴근 QR 코드' };
export default function Page() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1') notFound();
  return <main className="kiosk-screen"><section className="kiosk-screen__body"><FixtureKioskBoard /></section></main>;
}
