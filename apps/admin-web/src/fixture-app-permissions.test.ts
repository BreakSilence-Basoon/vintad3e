import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureAppId, fixtureAppMembers, fixtureMenuPermissions, fixtureMenus } from './fixture-app-permissions.ts';

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
  assert.deepEqual(fixtureAppMembers('development', '1', 'portal', now).map(row => row.access), ['크루', '어드민']);
  assert.deepEqual(fixtureAppMembers('development', '1', 'partners', now).map(row => row.access), ['게스트', '어드민']);
  assert.deepEqual(fixtureAppMembers('development', '1', 'creative', now), []);
});

test('menu permission examples are synthetic, app-specific and development-only', () => {
  assert.deepEqual(fixtureMenuPermissions('production', '1', 'partners'), []);
  assert.deepEqual(fixtureMenuPermissions('development', undefined, 'partners'), []);
  assert.deepEqual(fixtureMenuPermissions('development', '1', 'missing'), []);
  assert.deepEqual(fixtureMenuPermissions('development', '1', 'partners').slice(0, 2), [
    { menu: 'DJ', admin: '전체', crew: '없음', guest: '없음' },
    { menu: 'proj.bedroom', admin: '전체', crew: '없음', guest: '없음' },
  ]);
  assert.deepEqual(fixtureMenuPermissions('development', '1', 'partners').at(-1), { menu: '협업처', admin: '전체', crew: '없음', guest: '읽기만' });
  assert.equal(fixtureMenuPermissions('development', '1', 'portal')[0].menu, '앱 타일');
});
