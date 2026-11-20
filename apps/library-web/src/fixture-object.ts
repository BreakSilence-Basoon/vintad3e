export const OBJECT_ID = '00000000-0000-4000-8000-000000000003';
export const CORRECTED_OBJECT_ID = '00000000-0000-4000-8000-000000000011';
export const CORRECTED_DOCUMENT_ID = '00000000-0000-4000-8000-000000000012';

export function getFixtureObject(env: string | undefined, enabled: string | undefined, id: string) {
  if (env !== 'development' || enabled !== '1') return null;
  if (id === OBJECT_ID) return { id: OBJECT_ID, filename: '업무 안내.txt', body: '업무를 시작하기 전에 필요한 사항을 확인합니다.' };
  if (id === CORRECTED_OBJECT_ID) return { id: CORRECTED_OBJECT_ID, filename: '회의 보정.html', body: '<p><strong>직원</strong> 업무 순서를 확인합니다. [¹] <strong>담당자</strong> 다음 순서를 정합니다.</p><table><tbody><tr><td>¹</td><td>업무 순서를 확인한 근거</td></tr></tbody></table>' };
  return null;
}
