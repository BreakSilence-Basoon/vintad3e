import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureCouponLink, getCouponFixtures, selectCouponFixture } from './coupon-fixture.ts';

test('coupon fixture requires explicit development opt-in', () => {
  assert.deepEqual(getCouponFixtures('production', '1'), []);
  assert.deepEqual(getCouponFixtures('development', undefined), []);
  const fixtures = getCouponFixtures('development', '1');
  assert.equal(selectCouponFixture(fixtures, 'supporter-1')?.code, 'VINTAD3E');
  assert.equal(selectCouponFixture(fixtures, 'supporter-1')?.hasUsage, true);
  assert.equal(selectCouponFixture(fixtures, 'supporter-2')?.hasUsage, false);
  assert.equal(selectCouponFixture(fixtures, ['supporter-2', 'supporter-1'])?.id, 'supporter-2');
  assert.equal(selectCouponFixture(fixtures, 'other'), undefined);
  assert.equal(selectCouponFixture(fixtures, undefined), undefined);
});

test('coupon fixture links use a reserved non-operational domain', () => {
  const url = new URL(fixtureCouponLink('japan', 'ja'));
  assert.equal(url.hostname, 'example.invalid');
  assert.equal(url.searchParams.get('mall'), 'japan');
  assert.equal(url.searchParams.get('lang'), 'ja');
  assert.equal(new URL(fixtureCouponLink('korea', null)).searchParams.has('lang'), false);
});
