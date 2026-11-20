import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import '../../formula-guide-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Supporters > 정산 공식' };
export default async function Page() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fformula-info');
  return <main className="formula-guide" id="formula-guide-top" lang="ko"><div className="formula-guide__title"><div className="formula-guide__title-row"><h1>Supporters</h1></div><div className="formula-guide__title-meta"><p>정산 안내</p></div></div><div className="formula-guide__reading"><article aria-label="정산 안내"><section aria-labelledby="sns-performance"><h2 id="sns-performance">SNS 성과</h2><p>게시물과 계정의 성과를 확인합니다.</p></section><section aria-labelledby="coupon-sales"><h2 id="coupon-sales">쿠폰 판매</h2><p>판매와 정산에 적용할 기준을 함께 확인합니다.</p></section><section aria-labelledby="appendix"><h2 id="appendix">정산 안내</h2><p>정산 금액은 정해진 기준에 따라 확인합니다.</p></section></article></div><a className="formula-guide__backtop" href="#formula-guide-top" aria-label="맨 위로" title="맨 위로"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a></main>;
}
