import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { fixtureNext, fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { StaffToastViewport } from '@vintad3e/ui/toast';
import { getCouponFixtures, selectCouponFixture } from '../coupon-fixture';
import { CouponStaffSelector } from '../sns-fixture-selector';
import { CouponAnalyticsPanel } from '../coupon-analytics-panel';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Supporters' };

export default async function Page({ searchParams }: { searchParams: Promise<{ staff?: string | string[]; from?: string; to?: string }> }) {
  const fixtures = getCouponFixtures(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE);
  if (!fixtures.length) notFound();
  const params = await searchParams;
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) {
    const query = new URLSearchParams();
    for (const key of ['staff', 'from', 'to'] as const) {
      const value = params[key];
      if (typeof value === 'string') query.set(key, value);
    }
    const next = fixtureNext(query.size ? `/?${query}` : '/');
    redirect(`/sign-in?${new URLSearchParams({ next })}`);
  }
  const selected = selectCouponFixture(fixtures, params.staff);
  const members = fixtures.map(item => ({ staffId: item.id, displayName: item.displayName }));
  const month = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long' }).format(new Date());
  return <main className="gtm-home">
    <section className="gtm-page home-dashboard"><section className="dashboard-monitor__quantity-copy home-account-summary" aria-label="홈 요약">
      <div className="dashboard-monitor__freshness"><p>안녕하세요 <strong>관리자</strong>님!</p><p>{selected ? month : '성과를 확인해볼까요?'}</p></div>
      <div className="dashboard-monitor__quantity-summary home-account-summary__connections"><CouponStaffSelector selected={selected?.id ?? ''} page="home" compact members={members} /></div>
    </section></section>
    {selected ? <div key={selected.id} className="staff-home-content"><section className="gtm-page performance-page">
      <section className="performance-account-grid" aria-label="계정별 성과">
        {(['Instagram', 'TikTok'] as const).map(platform => <article className={`performance-account-card performance-account-card--${platform.toLowerCase()}`} key={platform}>
          <div className="performance-account-card__score"><div className="performance-account-card__score-row"><span className="performance-account-card__score-label">{platform} <b className="performance-account-card__count">(2건)</b> 기대치 달성률</span><strong>80%</strong></div><div className="performance-account-card__bar"><i style={{ width: '80%' }} /></div></div>
          <div className="performance-account-card__grade">{(platform === 'Instagram' ? ['조회', '좋아요', '댓글', '공유', '저장', '도달'] : ['조회', '좋아요', '댓글', '공유']).map(label => <div key={label}><span>{label}</span><strong className="performance-account-card__comparison"><span className="performance-account-card__comparison-actual">8</span><span className="performance-account-card__comparison-divider">/</span><span className="performance-account-card__comparison-expected">10</span></strong></div>)}</div>
        </article>)}
      </section>
      {selected.hasUsage && <div className="performance-analytics"><CouponAnalyticsPanel preview range={{ from: params.from, to: params.to }} /></div>}
      {selected.hasUsage && <section className="performance-coupon-board" aria-label="판매보상 산정"><div className="performance-card__header"><strong>판매보상 산정</strong><span>{month} 기준</span></div>
        <div className="performance-coupon-board__primary"><span>이번 달 원화 귀속 매출<strong>12,345원</strong></span><span>다음 구간까지<strong>87,655원</strong></span></div>
        <div className="performance-coupon-board__metrics"><span>주문<strong className="performance-coupon-board__breakdown"><b>2<small>KR</small></b><b><em> + </em>1<small>GL</small></b><b><em> + </em>1<small>JP</small></b></strong></span><span>지급률<strong className="performance-coupon-board__rates"><b className="is-current">1%</b><b>2%</b><b>3%</b></strong></span></div>
      </section>}
      <section className="gtm-section performance-board" aria-label="성과 요약"><div className="performance-card__header"><strong>이번달 예상</strong><span>{month}</span></div><div className="performance-stat-strip">{[['SNS 점수 충족률', '80%'], ['성과보너스', '1,234원'], ['판매보상', '123원'], ['인센티브', '1,357원']].map(([label, value]) => <span key={label}><strong>{value}</strong>{label}</span>)}</div></section>
    </section></div> : <div className="staff-home-empty" aria-hidden="true"><img src="/icon.svg" alt="" /></div>}
    <StaffToastViewport />
  </main>;
}
