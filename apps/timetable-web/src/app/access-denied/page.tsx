import { SignOutButton } from './sign-out-button';
import './state.css';

export const metadata = { title: '빈타제 > Timetable > Timetable을 사용할 수 없습니다' };
type Props = { searchParams?: Promise<{ reason?: string | string[] }> };

export default async function AccessDeniedPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  return <main className="state-page"><section className="state-panel">
    <h1>Timetable을 사용할 수 없습니다.</h1>
    <p>{reason || '등록된 직원 계정인지 확인한 뒤 관리자에게 문의해주세요.'}</p>
    <SignOutButton />
  </section></main>;
}
