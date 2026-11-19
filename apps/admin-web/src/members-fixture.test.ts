import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureGrants, fixtureMemberType, fixtureTier, getFixtureMembers, membersOfType } from './members-fixture.ts';

test('members are restricted to an explicit development fixture', () => {
  assert.deepEqual(getFixtureMembers('production', '1'), []);
  assert.deepEqual(getFixtureMembers('development', undefined), []);
  const members = getFixtureMembers('development', '1');
  assert.equal(members.length, 3);
  assert.ok(members.every(member => member.primaryEmail.endsWith('@example.invalid')));
});
test('fixture details fail closed outside development and use separate employee and guest grants', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(fixtureGrants('production', '1', members[0].staffId), null);
  assert.equal(fixtureGrants('development', undefined, members[0].staffId), null);
  assert.equal(fixtureGrants('development', '1', 'unknown'), null);
  const employee = fixtureGrants('development', '1', members[0].staffId)!;
  const partner = fixtureGrants('development', '1', members[1].staffId)!;
  assert.deepEqual(employee.map(grant => grant.appId), ['portal']);
  assert.deepEqual(partner.map(grant => grant.appId), ['partners']);
  assert.equal(fixtureTier(members[0], employee), '크루');
  assert.equal(fixtureTier(members[1], partner), '게스트');
  const admin = fixtureGrants('development', '1', members[2].staffId)!;
  assert.deepEqual(admin.map(grant => grant.appId), ['portal', 'partners', 'admin']);
  assert.equal(fixtureTier(members[2], admin), '어드민');
});
test('member type selects only the corresponding synthetic members', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(fixtureMemberType(undefined), 'employee');
  assert.equal(fixtureMemberType('partner'), 'partner');
  assert.equal(fixtureMemberType('unknown'), 'employee');
  assert.equal(fixtureMemberType(['employee', 'partner']), null);
  assert.deepEqual(membersOfType(members, 'employee').map(member => member.displayName), ['직원 01', '관리자 01']);
  assert.deepEqual(membersOfType(members, 'partner').map(member => member.displayName), ['외부 구성원 01']);
});
