import { fixtureApps, fixtureGrantActive, fixtureGrants, getFixtureMembers } from './members-fixture.ts';

// Menu names mirror the source screens; displayed role values are synthetic.
const menuNames: Record<string, readonly string[]> = {
  portal: ['앱 타일'], apparel: ['홈 대시보드', '인벤토리', '판매내역', '통계', '데이터 변경 이력', '용어집'],
  timetable: ['출근부', '근무시간표', 'QR 관리'], supporters: ['Instagram', 'TikTok', '쿠폰', '정산 내역', '정산 공식', '지급 체크'],
  partners: ['DJ', 'proj.bedroom', '대관', '정산 체크', '협업처'], library: ['홈', '게시', '보관함', '구성원', '마이페이지'],
  floor: ['메뉴 분석', '판매내역', '재고 관리'], ledger: ['앱 접근'], creative: ['앱 접근'],
  admin: ['앱 접근'], chat: ['외부 AI 연결 승인', '웹 화면'],
};
export function fixtureMenus(appId: string): readonly string[] { return menuNames[appId] ?? []; }

// Synthetic presentation values only. These do not authorize any operation.
export function fixtureMenuPermissions(env: string | undefined, enabled: string | undefined, appId: string) {
  if (env !== 'development' || enabled !== '1') return [];
  return fixtureMenus(appId).map((menu, index) => ({
    menu, admin: appId === 'partners' ? '전체' : index === 0 ? '조회' : '전체',
    crew: appId !== 'partners' && index === 0 ? '조회' : '없음',
    guest: appId === 'partners' && menu === '협업처' ? '읽기만' : '없음',
  }));
}
export function fixtureAppId(value: string | undefined): string { return fixtureApps.find(app => app.id === value)?.id ?? fixtureApps[0].id; }
export function fixtureAppMembers(env: string | undefined, enabled: string | undefined, appId: string, now: number) {
  return getFixtureMembers(env, enabled).flatMap(member => {
    const grant = fixtureGrants(env, enabled, member.staffId)?.find(item => item.appId === appId && fixtureGrantActive(item, now));
    if (!grant) return [];
    return [{ person: { id: member.staffId, name: member.displayName }, access: member.memberType === 'partner' ? '게스트' : grant.role === 'ADMIN' ? '어드민' : '크루' }];
  });
}
