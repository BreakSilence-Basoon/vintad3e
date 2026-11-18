export type MemberType = 'employee' | 'partner';
export type FixtureMember = { staffId: string; displayName: string; primaryEmail: string; memberType: MemberType; status: string; positionTitle: string | null; gradeLabel: string | null };
export const memberTypeLabel: Record<MemberType, string> = { employee: '직원', partner: '외부 구성원' };

export function getFixtureMembers(env: string | undefined, enabled: string | undefined): FixtureMember[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { staffId: '00000000-0000-4000-8000-000000000001', displayName: '직원 01', primaryEmail: 'staff01@example.invalid', memberType: 'employee', status: '재직', positionTitle: '직원', gradeLabel: null },
    { staffId: '00000000-0000-4000-8000-000000000002', displayName: '외부 구성원 01', primaryEmail: 'partner01@example.invalid', memberType: 'partner', status: '활동 중', positionTitle: null, gradeLabel: null },
  ];
}

export function fixtureMemberType(value: string | string[] | undefined): MemberType | null {
  if (Array.isArray(value)) return null;
  return value === 'partner' ? 'partner' : 'employee';
}

export function membersOfType(members: FixtureMember[], type: MemberType): FixtureMember[] {
  return members.filter(member => member.memberType === type);
}
