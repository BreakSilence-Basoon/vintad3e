export const OBJECT_ID = '00000000-0000-4000-8000-000000000003';

export function getFixtureObject(env: string | undefined, enabled: string | undefined, id: string) {
  if (env !== 'development' || enabled !== '1' || id !== OBJECT_ID) return null;
  return { id: OBJECT_ID, filename: '업무 안내.txt', body: '업무를 시작하기 전에 필요한 사항을 확인합니다.' };
}
