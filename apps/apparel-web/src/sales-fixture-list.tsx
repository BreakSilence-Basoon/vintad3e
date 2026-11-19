import type { FixtureSale } from './sales-fixture';

const number = new Intl.NumberFormat('ko-KR');
const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });
export function SalesFixtureList({ sales }: { sales: FixtureSale[] }) {
  if (!sales.length) return <p className="audit-empty">아직 표시할 판매내역이 없습니다.</p>;
  return <>{sales.map(sale => <article key={sale.id} className="audit-card sales-audit-card">
    <div className="sales-audit-card__topline"><div className="sales-audit-card__source"><time dateTime={sale.soldAt}>{date.format(new Date(sale.soldAt))}</time><span>{sale.source === 'pos' ? '성수 매장 POS' : '성수 매장 티켓'}</span></div><span className={`status-pill status-pill--${sale.status === 'checked' ? 'live' : 'warning'}`}>{sale.status === 'checked' ? '교차 검증 완료' : '교차 검증 대기'}</span></div>
    <details className="sales-audit-card__details"><summary className="sales-audit-card__summary"><span className="sales-audit-card__items"><span className="sales-audit-card__item-line"><span className="sales-audit-card__item-name">{sale.item}</span><span className="sales-audit-card__quantity-chip">{number.format(sale.quantity)}개</span></span></span><strong>{sale.source === 'seongsu_ticket' ? '-' : `${number.format(sale.amount)} KRW`}</strong></summary>
      <dl className="sales-audit-card__snapshot"><div><dt>판매번호</dt><dd>{sale.number}</dd></div><div><dt>수량</dt><dd>{number.format(sale.quantity)}개</dd></div><div><dt>채널</dt><dd>성수 매장</dd></div><div><dt>판매 매장</dt><dd>성수 매장</dd></div><div><dt>차감 거점</dt><dd>성수 매장</dd></div><div><dt>메모</dt><dd>-</dd></div></dl>
    </details>
  </article>)}</>;
}
