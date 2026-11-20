import { getCouponFixtures, selectCouponFixture } from './coupon-fixture';
import { CouponStaffSelector } from './sns-fixture-selector';
import { SnsPerformanceTable } from './sns-performance-table';
import { getSnsFixturePosts } from './sns-fixture-posts';
import { SnsFixtureSelf } from './sns-fixture-self';

export function SnsFixturePage({ platform, staff }: { platform: 'instagram' | 'tiktok'; staff?: string | string[] }) {
  const fixtures = getCouponFixtures(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE);
  const selected = selectCouponFixture(fixtures, staff);
  const name = platform === 'instagram' ? 'Instagram' : 'TikTok';
  const self = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_SUPPORTERS_FIXTURE === '1' && process.env.VINTAD3E_SUPPORTERS_FIXTURE_SELF === '1';
  if (self) return <main className="gtm-console"><section className="gtm-page"><SnsFixtureSelf platform={platform} reports={getSnsFixturePosts(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE, platform, 'supporter-1')} /></section></main>;
  return <main className="gtm-console"><section className="gtm-page">
    {fixtures.length === 0 ? <section className="gtm-section gtm-section--connect"><p>{name} 계정을 연결한 서포터즈가 생기면 여기에서 성과를 볼 수 있습니다.</p></section> : <CouponStaffSelector selected={selected?.id ?? ''} page={platform} members={fixtures.map(item => ({ staffId: item.id, displayName: item.displayName }))} />}
    {selected && <><div className="gtm-sync-toolbar"><p className="gtm-sync-basis">{name} 동기화 기록 없음</p></div><section className="gtm-section gtm-section--sns-table"><SnsPerformanceTable platform={platform} reports={getSnsFixturePosts(process.env.NODE_ENV, process.env.VINTAD3E_SUPPORTERS_FIXTURE, platform, selected.id)} isOfficial={false} loadError={null} readOnly /></section></>}

  </section></main>;
}
