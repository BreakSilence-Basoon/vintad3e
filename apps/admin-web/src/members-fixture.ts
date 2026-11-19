export type MemberType = 'employee' | 'partner';
export type FixtureMember = { staffId: string; displayName: string; primaryEmail: string; memberType: MemberType; status: string; positionTitle: string | null; gradeLabel: string | null };
export const memberTypeLabel: Record<MemberType, string> = { employee: '직원', partner: '외부 구성원' };

export function getFixtureMembers(env: string | undefined, enabled: string | undefined): FixtureMember[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { staffId: '00000000-0000-4000-8000-000000000001', displayName: '직원 01', primaryEmail: 'staff01@example.invalid', memberType: 'employee', status: '재직', positionTitle: '직원', gradeLabel: null },
    { staffId: '00000000-0000-4000-8000-000000000002', displayName: '외부 구성원 01', primaryEmail: 'partner01@example.invalid', memberType: 'partner', status: '활동 중', positionTitle: null, gradeLabel: null },
    { staffId: '00000000-0000-4000-8000-000000000003', displayName: '관리자 01', primaryEmail: 'admin01@example.invalid', memberType: 'employee', status: '재직', positionTitle: '관리자', gradeLabel: null },
  ];
}

export function fixtureMemberType(value: string | string[] | undefined): MemberType | null {
  if (Array.isArray(value)) return null;
  return value === 'partner' ? 'partner' : 'employee';
}

export function membersOfType(members: FixtureMember[], type: MemberType): FixtureMember[] {
  return members.filter(member => member.memberType === type);
}

export type FixtureGrant = { appId: string; appName: string; role: 'VIEWER' | 'ADMIN'; validFrom: string; validUntil: string | null };
export const fixtureApps = [
  { id: 'portal', name: 'Portal' }, { id: 'apparel', name: 'Apparel' }, { id: 'timetable', name: 'Timetable' },
  { id: 'supporters', name: 'Supporters' }, { id: 'partners', name: 'Partners' }, { id: 'library', name: 'Library' },
  { id: 'floor', name: 'Floor' }, { id: 'ledger', name: 'Ledger' }, { id: 'creative', name: 'Creative' },
  { id: 'admin', name: 'Admin' }, { id: 'chat', name: 'Chat침깨' },
] as const;

export function fixtureGrants(env: string | undefined, enabled: string | undefined, id: string): FixtureGrant[] | null {
  const member = getFixtureMembers(env, enabled).find(item => item.staffId === id);
  if (!member) return null;
  if (member.staffId === '00000000-0000-4000-8000-000000000003') return fixtureApps.filter(app => ['portal', 'partners', 'admin'].includes(app.id)).map(app => ({ appId: app.id, appName: app.name, role: 'ADMIN', validFrom: '2000-01-01T00:00:00.000Z', validUntil: null }));
  const app = member.memberType === 'employee' ? fixtureApps[0] : fixtureApps[4];
  return [{ appId: app.id, appName: app.name, role: 'VIEWER', validFrom: '2000-01-01T00:00:00.000Z', validUntil: null }];
}

export function fixtureTier(member: FixtureMember, grants: FixtureGrant[]): '어드민' | '크루' | '게스트' {
  return member.memberType === 'partner' ? '게스트' : grants.some(grant => grant.role === 'ADMIN' && fixtureGrantActive(grant, Date.now())) ? '어드민' : '크루';
}

export function fixtureGrantActive(grant: FixtureGrant, now: number): boolean {
  const from = Date.parse(grant.validFrom), until = grant.validUntil === null ? Infinity : Date.parse(grant.validUntil);
  return Number.isFinite(from) && !Number.isNaN(until) && now >= from && now < until;
}
const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
export function formatKstDateTime(iso: string) { const time = Date.parse(iso); return Number.isFinite(time) ? formatter.format(time) : null; }
