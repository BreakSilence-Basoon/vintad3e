export const internalDocumentId = '00000000-0000-4000-8000-000000000001';
export type InternalKind = 'ir' | 'native';
export function internalDocuments(env:string|undefined, enabled:string|undefined) {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { kind:'ir' as const, id:internalDocumentId, title:'가게 안내 기록', publisher:'직원', createdAt:'2025-12-30T00:00:00.000Z', body:'업무를 시작하기 전에 필요한 사항을 확인합니다.' },
    { kind:'native' as const, id:internalDocumentId, title:'매장 인수인계 자료', publisher:'직원', createdAt:'2025-12-29T00:00:00.000Z', body:'함께 일하는 사람에게 필요한 내용을 전달합니다.' },
  ];
}
