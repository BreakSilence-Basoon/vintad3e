import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixtureInventory } from '../../../../inventory-fixture';
import { ShortageFixtureView } from '../../../../shortage-fixture-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '침깨 > Apparel > 부족 수량이 있는 옵션 품목' };
export default function InventoryShortagesPage() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_APPAREL_FIXTURE !== '1') notFound();
  const products = getFixtureInventory(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE);
  return <section className="console-page"><header className="console-page__header"><div><h1>부족 수량이 있는 옵션 품목</h1><p className="console-page__description">부족수량이 1 이상인 옵션을 먼저 보고, 부족 없음 탭에서 새 부족 항목을 추가합니다.</p></div><Link href="/" className="button button--ghost button--small">운영 홈</Link></header><ShortageFixtureView products={products} /></section>;
}
