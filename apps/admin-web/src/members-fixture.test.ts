import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureMemberType, getFixtureMembers, membersOfType } from './members-fixture.ts';

test('members are restricted to an explicit development fixture', () => {
  assert.deepEqual(getFixtureMembers('production', '1'), []);
  assert.deepEqual(getFixtureMembers('development', undefined), []);
  const members = getFixtureMembers('development', '1');
  assert.equal(members.length, 2);
  assert.ok(members.every(member => member.primaryEmail.endsWith('@example.invalid')));
});
test('member type selects only the corresponding synthetic members', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(fixtureMemberType(undefined), 'employee');
  assert.equal(fixtureMemberType('partner'), 'partner');
  assert.equal(fixtureMemberType('unknown'), 'employee');
  assert.equal(fixtureMemberType(['employee', 'partner']), null);
  assert.deepEqual(membersOfType(members, 'employee').map(member => member.displayName), ['직원 01']);
  assert.deepEqual(membersOfType(members, 'partner').map(member => member.displayName), ['외부 구성원 01']);
});
