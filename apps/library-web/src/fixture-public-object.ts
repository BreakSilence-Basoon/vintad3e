const fixtures = {
  objects: { id: '00000000-0000-4000-8000-000000000005', body: '업무를 시작하기 전에 필요한 사항을 확인합니다.' },
  documents: { id: '00000000-0000-4000-8000-000000000006', body: '함께 일하는 사람에게 필요한 내용을 전달합니다.' },
} as const;

export function getPublicFixture(env: string | undefined, enabled: string | undefined, kind: string, id: string) {
  if (env !== 'development' || enabled !== '1' || (kind !== 'objects' && kind !== 'documents')) return null;
  const fixture = fixtures[kind];
  return fixture.id === id.toLowerCase() ? fixture : null;
}
