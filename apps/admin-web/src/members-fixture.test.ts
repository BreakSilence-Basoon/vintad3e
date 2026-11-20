import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureGrantActive, fixtureGrantDisplay, fixtureGrants, fixtureMemberPage, fixtureMemberType, fixtureTier, getFixtureMembers, membersOfType } from './members-fixture.ts';

test('members are restricted to an explicit development fixture', () => {
  assert.deepEqual(getFixtureMembers('production', '1'), []);
  assert.deepEqual(getFixtureMembers('development', undefined), []);
  const members = getFixtureMembers('development', '1');
  assert.equal(members.length, 53);
  assert.ok(members.every(member => member.primaryEmail.endsWith('@example.invalid')));
});
test('fixture details fail closed outside development and use separate employee and guest grants', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(fixtureGrants('production', '1', members[0].staffId), null);
  assert.equal(fixtureGrants('development', undefined, members[0].staffId), null);
  assert.equal(fixtureGrants('development', '1', 'unknown'), null);
  const employee = fixtureGrants('development', '1', members[0].staffId)!;
  const partner = fixtureGrants('development', '1', members[1].staffId)!;
  assert.deepEqual(employee.map(grant => grant.appId), ['portal', 'apparel', 'timetable', 'library', 'creative']);
  assert.deepEqual(partner.map(grant => grant.appId), ['partners']);
  assert.equal(fixtureTier(members[0], employee), '크루');
  assert.equal(fixtureTier(members[1], partner), '게스트');
  const admin = fixtureGrants('development', '1', members[2].staffId)!;
  assert.deepEqual(admin.map(grant => grant.appId), ['portal', 'partners', 'admin']);
  assert.equal(fixtureTier(members[2], admin), '어드민');
});

test('grant status and date boundaries match the source and inactive grants do not confer fixture access', () => {
  const employee = fixtureGrants('development', '1', '00000000-0000-4000-8000-000000000001')!;
  const now = Date.parse('2026-11-19T00:00:00Z');
  assert.deepEqual(employee.map(grant => fixtureGrantDisplay(grant, now).label), ['사용 중', '기간 만료', '시작 전', '일시 정지', '회수됨']);
  assert.deepEqual(employee.filter(grant => fixtureGrantActive(grant, now)).map(grant => grant.appId), ['portal']);
  const base = employee[0];
  assert.equal(fixtureGrantDisplay({ ...base, validFrom: '2026-11-19T00:00:00Z' }, now).label, '사용 중');
  assert.equal(fixtureGrantDisplay({ ...base, validUntil: '2026-11-19T00:00:00Z' }, now).label, '기간 만료');
  assert.equal(fixtureGrantDisplay({ ...base, validFrom: 'invalid' }, now).label, '확인 필요');
  assert.equal(fixtureGrantDisplay({ ...base, status: 'SUSPENDED', validFrom: 'invalid' }, now).label, '일시 정지');
  assert.equal(fixtureGrantDisplay({ ...base, status: 'REVOKED', validFrom: 'invalid' }, now).label, '회수됨');
  assert.equal(fixtureGrantActive(base, NaN), false);
});
test('member type selects only the corresponding synthetic members', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(fixtureMemberType(undefined), 'employee');
  assert.equal(fixtureMemberType('partner'), 'partner');
  assert.equal(fixtureMemberType('unknown'), 'employee');
  assert.equal(fixtureMemberType(['employee', 'partner']), null);
  assert.equal(membersOfType(members, 'employee').length, 52);
  assert.deepEqual(membersOfType(members, 'employee').slice(0, 2).map(member => member.displayName), ['직원 01', '관리자 01']);
  assert.deepEqual(membersOfType(members, 'partner').map(member => member.displayName), ['외부 구성원 01']);
});

test('directory pages preserve member type and reject invalid cursors', () => {
  const members = getFixtureMembers('development', '1');
  const first = fixtureMemberPage(members, 'employee', undefined)!;
  assert.equal(first.rows.length, 50);
  assert.equal(first.next, 'employee:50');
  const second = fixtureMemberPage(members, 'employee', first.next!)!;
  assert.equal(second.rows.length, 2);
  assert.equal(second.previous, true);
  assert.equal(second.next, null);
  assert.ok(second.rows.every(row => !first.rows.some(previous => previous.staffId === row.staffId)));
  assert.equal(fixtureMemberPage(members, 'partner', 'employee:50'), null);
  assert.equal(fixtureMemberPage(members, 'employee', ['employee:50', 'employee:50']), null);
  assert.equal(fixtureMemberPage(members, 'employee', 'employee:100'), null);
});
