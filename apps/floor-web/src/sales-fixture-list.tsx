import type { FixtureSale } from './sales-fixture';

const time = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });
const number = new Intl.NumberFormat('ko-KR');
const statuses = { PAID: { label: '정상 결제', tone: 'normal' }, PARTIALLY_CANCELLED: { label: '일부 결제 취소', tone: 'warning' }, CANCELLED: { label: '결제 취소', tone: 'danger' } } as const;
export function SalesFixtureList({ sales }: { sales: FixtureSale[] }) {
  if (!sales.length) return <p className="audit-empty">아직 표시할 판매내역이 없습니다.</p>;
  return <>{sales.map(sale => { const status = statuses[sale.paymentStatus]; const source = sale.sourceSystem === 'CAFE24' ? 'Cafe24 주문' : sale.sourceSystem === 'OPENCLAW' ? '성수 매장 티켓' : '성수 매장 POS'; return <article key={sale.id} className="audit-card sales-audit-card"><div className="sales-audit-card__topline"><div className="sales-audit-card__source"><time dateTime={sale.soldAt}>{time.format(new Date(sale.soldAt))}</time><span>{source}</span></div><span title="주문 전체 결제 상태" className={`status-pill status-pill--${status.tone}`}>{status.label}</span></div><div className="sales-audit-card__summary"><span className="sales-audit-card__items">{sale.items.map((item, index) => <span key={`${sale.id}-${index}`} className="sales-audit-card__item-line"><span className="sales-audit-card__item-name">{item.name}</span><span className="sales-audit-card__quantity-chip">{number.format(item.quantity)}개</span></span>)}</span><strong>{sale.sourceSystem === 'OPENCLAW' || !sale.netAmountValue ? '-' : `${number.format(sale.netAmountValue)} ${sale.currencyCode}`}</strong></div></article>; })}</>;
}
