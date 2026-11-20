import { getCouponFixtures, selectCouponFixture } from '../../coupon-fixture';
import { CouponFixtureView } from '../../coupon-fixture-view';
import { requireFixtureSupportersAccess } from '../../fixture-access';
import { LoadErrorToast } from '../../load-error-toast';

export default async function Page({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  await requireFixtureSupportersAccess('/coupon');
  const fixtures = getCouponFixtures(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE);
  const selected = selectCouponFixture(fixtures, (await searchParams).staff);
  const state = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_SUPPORTERS_FIXTURE === '1' ? process.env.VINTAD3E_SUPPORTERS_COUPON_STATE : undefined;
  const message = state === 'error' ? '쿠폰 주문 정보를 불러오지 못했습니다.' : state === 'partial' ? '쿠폰 주문 정보를 모두 확인할 수 없습니다.' : null;
  return <main className="gtm-console"><section className="gtm-page coupon-share-page">{message && <LoadErrorToast message={message} />}{fixtures.length ? <CouponFixtureView fixtures={fixtures} selected={selected} /> : <section className="gtm-section gtm-section--connect"><p>쿠폰이 발급된 서포터즈가 생기면 여기에서 쿠폰 사용을 볼 수 있습니다.</p></section>}</section></main>;
}
