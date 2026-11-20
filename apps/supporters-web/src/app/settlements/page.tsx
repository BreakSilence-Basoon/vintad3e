import { getCouponFixtures, selectCouponFixture } from '../../coupon-fixture';
import { CouponStaffSelector } from '../../sns-fixture-selector';
import { SettlementFixtureTable } from '../../settlement-fixture-table';
import { koreanYear } from '../../settlement-viewer-calendar';
import { requireFixtureSupportersAccess } from '../../fixture-access';

export const metadata = { title: '빈타제 > Supporters > 정산 내역' };
export const dynamic = 'force-dynamic';
export default async function SettlementsPage({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  const params = await searchParams;
  const next = typeof params.staff === 'string' ? `/settlements?${new URLSearchParams({staff: params.staff})}` : '/settlements';
  await requireFixtureSupportersAccess(next);
  const fixtures = getCouponFixtures(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE);
  const selected = selectCouponFixture(fixtures, params.staff);
  return <main className="gtm-console"><section className="gtm-page settlement-history-page">
    <CouponStaffSelector selected={selected?.id ?? ''} page="settlements" members={fixtures.map(item => ({ staffId: item.id, displayName: item.displayName }))} />
    {selected && <section className="settlement-history settlement-history--viewer" aria-label="정산 내역" data-fixture-staff={selected.id}><SettlementFixtureTable key={selected.id} staff={selected.id} currentYear={koreanYear(new Date())} /></section>}

  </section></main>;
}
