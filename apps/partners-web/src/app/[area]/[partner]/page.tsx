import { notFound } from 'next/navigation';
import { requireFixturePartnersStaff } from '../../../fixture-staff-access';
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
  if (partner === 'partner-01' || partner === 'partner-02') await requireFixturePartnersStaff(`/proj-bedroom/${partner}`);
  return <PartnerPage params={Promise.resolve({ partner })} />;
}
