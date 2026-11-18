export type CreativeStatus = 'planning' | 'in-production' | 'completed' | 'archived';
export type FixtureProject = { projectId: string; title: string; status: CreativeStatus; updatedAt: string };
export const projectStatusLabel: Record<CreativeStatus, string> = { planning: '기획', 'in-production': '제작 중', completed: '완료', archived: '보관' };

export function getCreativeFixtures(env: string | undefined, enabled: string | undefined): FixtureProject[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { projectId: 'project-1', title: '매장 촬영', status: 'in-production', updatedAt: '2026-01-02T00:00:00.000Z' },
    { projectId: 'project-2', title: '홍보 자료', status: 'planning', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
}

const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
export function formatKstDateTime(iso: string) {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? formatter.format(time) : null;
}
