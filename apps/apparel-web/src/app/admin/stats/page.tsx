import { notFound } from 'next/navigation';
import { SalesOverviewBoard } from '../../../sales-overview-board';
import { getSalesOverviewFixture } from '../../../sales-overview-fixture';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 통계' };
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> }) {
  const params = await searchParams;
  if (Array.isArray(params.from) || Array.isArray(params.to)) notFound();
  const data = getSalesOverviewFixture(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, new Date(), params.from, params.to);
  if (!data) notFound();
  return <section className="console-page"><SalesOverviewBoard initial={data} /></section>;
}
