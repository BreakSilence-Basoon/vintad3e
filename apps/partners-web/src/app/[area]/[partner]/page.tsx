import { notFound } from 'next/navigation';
import PartnerPage from '../../../area-partner';
import { bedroomFixtures } from '../../../bedroom-fixture';
import { seoulDate } from '../../../partner-schedule';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ area: string; partner: string }> };
export async function generateMetadata({ params }: Props) {
  const { area, partner } = await params;
  const fixture = area === 'proj-bedroom' ? bedroomFixtures(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()))?.find(item => item.id === partner) : null;
  return { title: `빈타제 > Partners > ${fixture?.name ?? '협업처'}` };
}
export default async function AreaPartnerPage({ params }: Props) {
  const { area, partner } = await params;
  if (area !== 'proj-bedroom') notFound();
  return <PartnerPage params={Promise.resolve({ partner })} />;
}
