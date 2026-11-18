export type FixtureMember = { id: string; name: string };

export function getFixtureMembers(env: string | undefined, enabled: string | undefined): FixtureMember[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [{ id: 'member-1', name: '직원' }, { id: 'member-2', name: '관리자' }];
}

export function searchFixtureMembers(members: FixtureMember[], query: string): FixtureMember[] {
  const term = query.trim().toLocaleLowerCase('ko');
  return members.filter(member => member.name.toLocaleLowerCase('ko').includes(term));
}
