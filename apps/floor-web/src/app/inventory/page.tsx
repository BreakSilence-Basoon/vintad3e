import { notFound } from 'next/navigation';
import { fixtureInventory } from '../../inventory-fixture';
import { InventoryWorkspace } from '../../inventory-fixture-view';
import { requireFixtureFloorAccess } from '../../fixture-access';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Floor > 재고 관리' };
export default async function InventoryPage() {
  await requireFixtureFloorAccess('/inventory');
  const data = fixtureInventory(process.env.NODE_ENV, process.env.VINTAD3E_FLOOR_FIXTURE);
  if (!data) notFound();
  return <main className="floor-console floor-page"><header className="floor-page__header"><h1>재고 관리</h1><p>F&B 재료와 메뉴별 사용량, 구매·입고 내역을 기록합니다.</p></header><InventoryWorkspace data={data} canWrite={process.env.VINTAD3E_FLOOR_FIXTURE_ADMIN === '1'}/></main>;
}
