import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureAppId, fixtureAppMembers, fixtureMenus } from './fixture-app-permissions.ts';

test('app permission selection and synthetic menu names', () => {
  assert.equal(fixtureAppId(undefined), 'portal');
  assert.equal(fixtureAppId('missing'), 'portal');
  assert.equal(fixtureAppId('partners'), 'partners');
  assert.ok(fixtureMenus('partners').includes('대관'));
  assert.deepEqual(fixtureMenus('missing'), []);
});
test('app members are synthetic, separated by app and gated to development', () => {
  const now = Date.parse('2026-11-18T00:00:00Z');
  assert.deepEqual(fixtureAppMembers('production', '1', 'portal', now), []);
  assert.deepEqual(fixtureAppMembers('development', undefined, 'portal', now), []);
  assert.deepEqual(fixtureAppMembers('development', '1', 'portal', now).map(row => row.access), ['크루']);
  assert.deepEqual(fixtureAppMembers('development', '1', 'partners', now).map(row => row.access), ['게스트']);
  assert.deepEqual(fixtureAppMembers('development', '1', 'creative', now), []);
});
