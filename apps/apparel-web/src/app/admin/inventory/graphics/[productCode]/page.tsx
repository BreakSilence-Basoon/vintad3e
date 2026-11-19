import { notFound } from 'next/navigation';
import { getFixtureInventory } from '../../../../../inventory-fixture';
import { GraphicFixtureView } from '../../../../../graphic-fixture-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 인벤토리' };
export default async function GraphicInventoryPage({ params }: { params: Promise<{ productCode: string }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_APPAREL_FIXTURE !== '1') notFound();
  const { productCode } = await params;
  const product = getFixtureInventory(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE).find(item => item.code === productCode);
  if (!product) notFound();
  return <GraphicFixtureView product={product} />;
}
