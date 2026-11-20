import Link from 'next/link';
import { notFound } from 'next/navigation';
import '../../../kiosk-original.css';
import { FixtureKioskSetupReturn } from '../../../fixture-kiosk-view';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Timetable > QR 코드 발급 기기로 등록되지 않았습니다' };
export default function Page() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_TIMETABLE_FIXTURE !== '1') notFound();
  return <main className="kiosk-setup"><FixtureKioskSetupReturn /><section className="kiosk-setup__panel"><h1>QR 코드 발급 기기로 등록되지 않았습니다.</h1><p>관리자 계정으로 로그인한 뒤 현재 브라우저를 QR 코드 발급 기기로 등록해주세요.</p><Link className="button button--primary" href="/admin/kiosks">QR 관리로 이동</Link></section></main>;
}
