import { notFound } from 'next/navigation';
import DjPage from '../../area-dj';
import BedroomsPage from '../../area-bedrooms';
import RentalPage from '../../area-rental';
import { partnerAreas } from '../../partner-schedule';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ area: string }> };
export async function generateMetadata({ params }: Props) {
  const { area } = await params;
  return { title: `빈타제 > Partners > ${partnerAreas.find(item => item.id === area)?.label ?? '화면을 찾을 수 없습니다'}` };
}
export default async function AreaPage({ params }: Props) {
  const { area } = await params;
  if (area === 'dj') return <DjPage />;
  if (area === 'proj-bedroom') return <BedroomsPage />;
  if (area === 'rental') return <RentalPage />;
  notFound();
}
