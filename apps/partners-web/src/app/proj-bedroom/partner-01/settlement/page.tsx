import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@vintad3e/ui/components';
import { fixtureOrigin, fixtureSession } from '../../../../fixture-session.mjs';
import { periodRows } from '../../../../fixture-collaboration.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Partners > 협업 정산 계산' };
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env); if (!origin) notFound();
  const h = await headers(), host = h.get('host'); if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(h.get('cookie'), host, process.env)) redirect('/sign-in');
  const params = await searchParams, from = typeof params.from === 'string' ? params.from : '', to = typeof params.to === 'string' ? params.to : '';
  const rows = periodRows(params.from, params.to);
  return <main className="staff-console"><section className="console-card">
    <Link href="/proj-bedroom/partner-01">협업처 정산으로 돌아가기</Link><h1>협업 정산 계산</h1>
    <form className="admin-filter-bar"><label>시작일<input type="date" name="from" defaultValue={from} /></label><label>종료일<input type="date" name="to" defaultValue={to} /></label><Button variant="primary">조회</Button></form>
    {rows === null ? <p role="alert">조회 기간을 확인해 주세요.</p> : <><div className="partners-table-scroll" role="region" aria-label="협업 제품 판매 내역" tabIndex={0}><table className="simple-table"><thead><tr><th>판매일</th><th>옵션</th><th>순판매</th><th>반품</th><th>상태</th><th>예상 지급액</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.option}</td><td>{row.quantity}</td><td>{row.returned}</td><td>{row.status}</td><td>{row.payout.toLocaleString('ko-KR')}원</td></tr>)}</tbody></table></div>{rows.length === 0 && <p>조회 기간에 협업 제품 판매가 없습니다.</p>}</>}
  </section></main>;
}
