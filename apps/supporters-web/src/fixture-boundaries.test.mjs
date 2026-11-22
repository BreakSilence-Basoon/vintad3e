import test from 'node:test';
import assert from 'node:assert/strict';
import { getCouponFixtures, selectCouponFixture, fixtureCouponLink } from './coupon-fixture.ts';
import { calculateFixtureFormula, formatFixtureFormula } from './formula-config.mjs';
import { readFixturePayouts, writeFixturePayout } from './settlement-fixture-storage.ts';
import { readConnection, readRegistrations, readSync, writeConnection, writeRegistration, writeSync } from './sns-fixture-storage.ts';
import { fixtureOrigin, fixtureNext } from './fixture-session.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; }

test('coupon selection handles empty and invalid selections without modifying fixtures', () => {
  const fixtures = getCouponFixtures('development', '1');
  assert.equal(selectCouponFixture(fixtures, 'supporter-1')?.id, 'supporter-1');
  assert.equal(selectCouponFixture([], 'supporter-1'), undefined);
  assert.equal(selectCouponFixture(fixtures, []), undefined);
  assert.equal(selectCouponFixture(fixtures, 'unknown'), undefined);
  assert.deepEqual(getCouponFixtures('production', '1'), []);
  assert.equal(new URL(fixtureCouponLink('japan', 'ja')).hostname, 'example.invalid');
});

test('formula calculation handles rounding, invalid variables and empty expressions', () => {
  const div = (a, b) => ({ op: 'divide', left: { value: a }, right: { value: b } });
  const variables = { amount: 5, rate: 2 };
  assert.equal(calculateFixtureFormula(div(1, 2), variables), 1);
  assert.equal(calculateFixtureFormula(div(-1, 2), variables), -1);
  assert.equal(calculateFixtureFormula(div(1, 0), variables), null);
  for (const value of [null, {}, [], { amount: 1 }, { amount: 1, rate: 2, extra: 3 }, { amount: NaN, rate: 2 }]) assert.equal(calculateFixtureFormula({ value: 1 }, value), null);
  assert.equal(formatFixtureFormula({}, variables), null);
});

test('payout writes reject invalid months and dates while preserving stored values', () => {
  const store = memory();
  assert.deepEqual(readFixturePayouts(store, 'supporter-1'), {});
  assert.ok(writeFixturePayout(store, 'supporter-1', '2026-01', true, '2026-01-31'));
  const before = store.getItem('vintad3e:settlement:supporter-1');
  for (const [staff, month, date] of [['unknown','2026-01','2026-01-31'], ['supporter-1','2026-13','2026-01-31'], ['supporter-1','2026-02','2026-02-30'], ['supporter-1','','2026-01-31']]) assert.equal(writeFixturePayout(store, staff, month, true, date), null);
  assert.equal(store.getItem('vintad3e:settlement:supporter-1'), before);
});

test('payout reads reject malformed and excessive data without writing', () => {
  const store = memory(), slot = 'vintad3e:settlement:supporter-1';
  for (const raw of ['', '{', '[]', '{"2026-01":{"paid":"yes","checkedDate":null}}', 'x'.repeat(16001)]) {
    store.setItem(slot, raw);
    assert.equal(readFixturePayouts(store, 'supporter-1'), null);
    assert.equal(writeFixturePayout(store, 'supporter-1', '2026-01', true, '2026-01-01'), null);
    assert.equal(store.getItem(slot), raw);
  }
});

test('SNS storage rejects unknown platforms and blocked writes', () => {
  const store = memory(), broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(readRegistrations(store), {});
  assert.equal(readConnection(store, 'unknown'), null);
  assert.equal(readSync(store, 'unknown'), null);
  assert.equal(writeConnection(store, 'unknown', true), false);
  assert.equal(writeRegistration(store, 'instagram-1', 'true'), false);
  assert.equal(writeSync(store, 'instagram', new Date('invalid')), null);
  assert.equal(writeRegistration(broken, 'instagram-1', true), false);
});

test('session origin, return path and notices reject unsafe or empty inputs', () => {
  const env = { NODE_ENV: 'development', VINTAD3E_SUPPORTERS_FIXTURE: '1' };
  assert.ok(fixtureOrigin(env));
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_SUPPORTERS_FIXTURE_ORIGIN: 'http://localhost:3827' }), null);
  assert.equal(fixtureNext('//example.invalid'), '/');
  assert.equal(fixtureNext(''), '/');
  assert.equal(fixtureSignInNotice(''), null);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
