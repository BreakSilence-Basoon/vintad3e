import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAppIds, fixturePortalLinks } from './fixture-links.mjs';

test('fixture links require explicit development mode and a matching grant', () => {
  const enabled = { nodeEnv: 'development', enabled: '1', grants: ['timetable', 'unknown'] };
  assert.deepEqual(fixturePortalLinks(enabled), { timetable: 'http://127.0.0.1:3824/' });
  for (const input of [{ ...enabled, nodeEnv: 'production' }, { ...enabled, nodeEnv: 'test' }, { ...enabled, enabled: '0' }, { ...enabled, grants: [] }, { ...enabled, grants: null }, { ...enabled, grants: ['constructor', '__proto__'] }]) {
    assert.deepEqual(fixturePortalLinks(input), {});
  }
});

test('local fixture app links are explicit loopback destinations', () => {
  const links = fixturePortalLinks({ nodeEnv: 'development', enabled: '1', grants: fixtureAppIds });
  assert.equal(Object.keys(links).length, 8);
  assert.equal(links.library, 'http://127.0.0.1:3829/');
  assert.equal(links.supporters, 'http://127.0.0.1:3827/coupon');
  assert.ok(Object.values(links).every(href => new URL(href).hostname === '127.0.0.1'));
  assert.equal(links.ledger, undefined);
});
