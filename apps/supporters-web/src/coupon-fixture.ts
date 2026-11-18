export type CouponFixture = { id: string; displayName: string; hasUsage: boolean; code: string; referralMonth: number; referralTotal: number; personalMonth: number; personalTotal: number };

export function getCouponFixtures(env: string | undefined, enabled: string | undefined): CouponFixture[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { id: 'supporter-1', displayName: '서포터즈', hasUsage: true, code: 'VINTAD3E', referralMonth: 2, referralTotal: 7, personalMonth: 1, personalTotal: 5 },
    { id: 'supporter-2', displayName: '서포터즈 02', hasUsage: false, code: '', referralMonth: 0, referralTotal: 0, personalMonth: 0, personalTotal: 0 },
  ];
}

export function selectCouponFixture(fixtures: CouponFixture[], selection: string | string[] | undefined): CouponFixture | undefined {
  const id = Array.isArray(selection) ? selection[0] : selection;
  return fixtures.find((fixture) => fixture.id === id);
}

export function fixtureCouponLink(mall: 'korea' | 'japan', language: 'ko' | 'ja' | null) {
  const url = new URL('https://example.invalid/coupon');
  url.searchParams.set('by', 'supporter-1');
  url.searchParams.set('mall', mall);
  if (language) url.searchParams.set('lang', language);
  return url.toString();
}
