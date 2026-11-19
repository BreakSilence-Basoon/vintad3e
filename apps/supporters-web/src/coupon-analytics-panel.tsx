import { CouponAnalyticsDateFilter } from './coupon-analytics-date-filter';
import { CouponAnalyticsFunnelChart, type FunnelBucket } from './coupon-analytics-funnel-chart';
import { LoadErrorToast } from './load-error-toast';
import type { CouponSiteAnalytics } from './coupon-site-analytics-types';

const visitBreakdowns = ['유입 경로', '방문 페이지', '국가·지역', '기기', '브라우저', '운영체제'];
const actions = ['로그인/회원가입 클릭', '쿠폰 받기 클릭', '쿠폰 발급 성공', '쿠폰 발급 실패', '쇼핑몰 이동', '이용 안내 열기'];
const breakdownKeys = ['referrer', 'page', 'country', 'device', 'browser', 'os'] as const;
const actionKeys = ['loginJoin', 'receive', 'issueSuccess', 'issueFailure', 'shopMove', 'guideOpen'] as const;
const statusText: Record<Exclude<CouponSiteAnalytics['state'], 'ready'>, string> = {
  unconfigured: '연결 전',
  not_collecting: '수집 전',
  too_long: '최대 93일까지 조회할 수 있습니다',
  unavailable: '데이터를 불러올 수 없습니다',
};

function EmptyValue({ reason = '데이터를 불러올 수 없음' }: { reason?: string }) {
  return <span className="coupon-analytics__empty-value" aria-label={reason} title={reason}>—</span>;
}
export function CouponAnalyticsPanel({ preview = false, range: requested, data, purchases = null }: { preview?: boolean; range?: { from?: string; to?: string }; data?: CouponSiteAnalytics; purchases?: { date: string; orders: number }[] | null }) {
  const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const reversed = validDate(requested?.from) && validDate(requested?.to) && requested.to < requested.from;
  const range = validDate(requested?.from) && validDate(requested?.to) && requested.from <= requested.to ? { start: requested.from, end: requested.to } : { start: `${today.slice(0, 7)}-01`, end: today };
  const dayMs = 86400000;
  const firstDay = Date.parse(`${range.start}T00:00:00Z`);
  const days = Math.floor((Date.parse(`${range.end}T00:00:00Z`) - firstDay) / dayMs) + 1;
  const count = Math.min(days, 12);
  const dayText = (offset: number) => new Date(firstDay + offset * dayMs).toISOString().slice(5, 10).replace('-', '/');
  const buckets = Array.from({ length: count }, (_, index) => {
    const first = Math.floor(index * days / count);
    const last = Math.floor((index + 1) * days / count) - 1;
    const amount = Math.round((last - first + 1) * (70 + ((first + index * 17) % 40)));
    return { label: first === last ? dayText(first) : `${dayText(first)}–${dayText(last)}`, days: last - first + 1, visitors: amount, pageviews: Math.round(amount * 1.85),
      receiveClicks: Math.round(amount * .18), issueSuccess: Math.round(amount * .13), purchases: Math.round(amount * .04) } satisfies FunnelBucket;
  });
  const visits = buckets.reduce((sum, bucket) => sum + bucket.visitors, 0);
  const summaries = [`${visits.toLocaleString('ko-KR')}명`, `${Math.round(visits * 1.85).toLocaleString('ko-KR')}회`];
  const breakdowns = [
    [['Instagram', '48%'], ['직접 방문', '27%'], ['TikTok', '17%'], ['기타', '8%']],
    [['/coupon', '62%'], ['/guide', '25%'], ['기타', '13%']],
    [['일본', '54%'], ['한국', '25%'], ['미국', '9%'], ['대만', '6%'], ['기타', '6%']],
    [['모바일', '81%'], ['PC', '17%'], ['태블릿', '2%']],
    [['Safari', '45%'], ['Chrome', '39%'], ['기타', '16%']],
    [['iOS', '51%'], ['Android', '30%'], ['Windows', '14%'], ['기타', '5%']],
  ];
  const countUnit = (index: number) => actionKeys[index] === 'issueSuccess' || actionKeys[index] === 'issueFailure' ? '건' : '회';
  const actionCounts = [0.31, 0.18, 0.13, 0.005, 0.11, 0.06].map((rate, index) => `${Math.round(visits * rate).toLocaleString('ko-KR')}${countUnit(index)}`);
  const live = !preview && data?.state === 'ready' ? data : null;
  const liveCount = live ? Math.min(live.daily.length, 12) : 0;
  const liveBuckets = live ? Array.from({ length: liveCount }, (_, index) => {
    const first = Math.floor(index * live.daily.length / liveCount);
    const last = Math.floor((index + 1) * live.daily.length / liveCount) - 1;
    const label = (date: string) => date.slice(5).replace('-', '/');
    const span = live.daily.slice(first, last + 1);
    const sum = (key: 'visitors' | 'pageviews' | 'receiveClicks' | 'issueSuccess') => span.reduce((total, day) => total + day[key], 0);
    const bought = purchases ? span.map(day => purchases.find(row => row.date === day.date)?.orders) : null;
    return { label: first === last ? label(live.daily[first].date) : `${label(live.daily[first].date)}–${label(live.daily[last].date)}`, days: span.length,
      visitors: sum('visitors'), pageviews: sum('pageviews'), receiveClicks: sum('receiveClicks'), issueSuccess: sum('issueSuccess'),
      purchases: bought && bought.every(value => typeof value === 'number') ? bought.reduce<number>((total, value) => total + (value ?? 0), 0) : null } satisfies FunnelBucket;
  }) : [];
  const shown: FunnelBucket[] = live ? liveBuckets : buckets;
  const chartDays = live ? live.daily.length : days;
  const charted = preview || Boolean(live);
  const purchaseKnown = shown.some(bucket => bucket.purchases !== null);
  const legend = <ul className="coupon-analytics__legend" aria-label="그래프 범례">
    <li><i className="coupon-analytics__legend-swatch coupon-analytics__legend-swatch--visitors" />방문자</li>
    <li><i className="coupon-analytics__legend-swatch coupon-analytics__legend-swatch--receive" />쿠폰 받기 클릭</li>
    <li><i className="coupon-analytics__legend-swatch coupon-analytics__legend-swatch--issued" />쿠폰 발급 성공</li>
    {purchaseKnown && <li><i className="coupon-analytics__legend-dot" />쿠폰 구매</li>}
  </ul>;
  const liveSummaries = live ? [`${live.visitors.toLocaleString('ko-KR')}명`, `${live.pageviews.toLocaleString('ko-KR')}회`] : [];
  const status = preview || live ? null : statusText[data?.state && data.state !== 'ready' ? data.state : 'unavailable'];
  const dateFilter = (placement: 'mobile' | 'desktop') => <CouponAnalyticsDateFilter placement={placement} start={reversed ? requested!.from! : range.start} end={reversed ? requested!.to! : range.end} />;
  return (
    <section className="coupon-analytics" aria-labelledby="coupon-analytics-title">
      {reversed && <LoadErrorToast message="종료일은 시작일보다 빠를 수 없습니다." />}
      <div className="coupon-analytics__toolbar">
      <div className="coupon-analytics__heading">
        <h2 id="coupon-analytics-title">쿠폰 사이트 통계</h2>
        {status && <span>{status}</span>}
      </div>


      {dateFilter('mobile')}
      </div>

      <div className="coupon-analytics__content">
      <section className="coupon-analytics__section" aria-labelledby="coupon-visits-title">
        <h3 id="coupon-visits-title">방문</h3>
        <div className="coupon-analytics__summary-row">
          <dl className="coupon-analytics__summary">
            {['방문자', '페이지 조회'].map((label, index) => <div key={label}><dt>{label}</dt><dd>{preview ? summaries[index] : live ? liveSummaries[index] : <EmptyValue />}</dd></div>)}
          </dl>
          {dateFilter('desktop')}
        </div>
        <div className="coupon-analytics__trend" aria-label={charted ? `${range.start}부터 ${range.end}까지 방문 추이` : '기간별 방문 데이터 없음'}>
          <div className="coupon-analytics__trend-heading"><span>기간별 방문</span>{charted && <small className="coupon-analytics__period">{range.start.slice(2).replaceAll('-', '/')}–{range.end.slice(2).replaceAll('-', '/')} · {chartDays <= 12 ? '일별' : '기간별 합계'}</small>}{charted && legend}</div>{charted ? <CouponAnalyticsFunnelChart buckets={shown} wide={chartDays > 12} /> : <p>{data?.state === 'not_collecting' || data?.state === 'unconfigured' ? '방문 데이터 수집 전입니다.' : '방문 데이터를 불러올 수 없습니다.'}</p>}
        </div>
        <dl className="coupon-analytics__breakdowns">
          {visitBreakdowns.map((label, index) => {
            const rows = live ? live.breakdowns[breakdownKeys[index]].map(row => [row.name, `${row.share}%`] as const) : preview ? breakdowns[index] : null;
            return <div key={label}><dt>{label}</dt><dd>{rows && rows.length ? <ul className="coupon-analytics__breakdown-list">{rows.map(([name, value]) => <li key={name}><span>{name}</span><strong>{value}</strong></li>)}</ul> : <EmptyValue reason={live ? '기록 없음' : undefined} />}</dd></div>;
          })}
        </dl>
      </section>

      <section className="coupon-analytics__section" aria-labelledby="coupon-actions-title">
        <h3 id="coupon-actions-title">쿠폰 이용 행동</h3>
        <dl className="coupon-analytics__actions">
          {actions.map((label, index) => {
            return <div key={label}><dt>{label}</dt><dd>{preview ? actionCounts[index] : live ? `${live.actions[actionKeys[index]].toLocaleString('ko-KR')}${countUnit(index)}` : <EmptyValue />}</dd></div>;
          })}
        </dl>
      </section>
      </div>

    </section>
  );
}
