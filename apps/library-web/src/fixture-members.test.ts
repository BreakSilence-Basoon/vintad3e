import assert from 'node:assert/strict';
import test from 'node:test';
import { getFixtureMembers, searchFixtureMembers } from './fixture-members.ts';

test('members are available only with explicit development opt-in', () => {
  assert.deepEqual(getFixtureMembers('production', '1'), []);
  assert.deepEqual(getFixtureMembers('development', undefined), []);
  assert.equal(getFixtureMembers('development', '1').length, 2);
});

test('name search trims whitespace and returns an empty result when unmatched', () => {
  const members = getFixtureMembers('development', '1');
  assert.deepEqual(searchFixtureMembers(members, '  직원  ').map(member => member.name), ['직원']);
  assert.deepEqual(searchFixtureMembers(members, '찾을 수 없음'), []);
  assert.deepEqual(searchFixtureMembers(members, ''), members);
});
