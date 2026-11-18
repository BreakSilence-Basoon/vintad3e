export type AuditRow = { when: string; actor: string; target: string; summary: string; id: string; operation: string };

export function getAuditFixtures(env: string | undefined, enabled: string | undefined, now: Date): AuditRow[] {
  if (env !== 'development' || enabled !== '1' || !Number.isFinite(now.getTime())) return [];
  return [
    { id: 'audit-1', when: now.toISOString(), actor: '직원 01', target: '외부 구성원 01', summary: 'Partners 앱 권한 없음 → 게스트', operation: 'admin.app-grant.set' },
    { id: 'audit-2', when: new Date(now.getTime() - 86400000).toISOString(), actor: '직원 01', target: '직원 01', summary: '직책·등급 변경', operation: 'admin.member.profile.update' },
    ...Array.from({ length: 19 }, (_, index) => ({ id: `audit-${index + 3}`, when: new Date(now.getTime() - (index + 2) * 86400000).toISOString(), actor: '직원 02', target: '직원 02', summary: '직책·등급 변경', operation: 'admin.member.profile.update' })),
  ];
}
