import { getCouponFixtures, selectCouponFixture } from '../../coupon-fixture';
import { CouponFixtureView } from '../../coupon-fixture-view';

export default async function Page({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  const fixtures = getCouponFixtures(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE);
  const selected = selectCouponFixture(fixtures, (await searchParams).staff);
  return <main className="gtm-console"><section className="gtm-page coupon-share-page">{fixtures.length ? <CouponFixtureView fixtures={fixtures} selected={selected} /> : <section className="gtm-section gtm-section--connect"><p>쿠폰이 발급된 서포터즈가 생기면 여기에서 쿠폰 사용을 볼 수 있습니다.</p></section>}</section></main>;
}
