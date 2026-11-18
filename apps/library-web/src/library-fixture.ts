export type FixtureDocument = { id: string; title: string; publisher: string; createdAt: string; body: string };

export function getLibraryFixtures(env: string | undefined, enabled: string | undefined): FixtureDocument[] {
  if (env !== 'development' || enabled !== '1') return [];
  return [
    { id: '00000000-0000-4000-8000-000000000001', title: '매장 운영 안내', publisher: '직원', createdAt: '2026-01-02T00:00:00.000Z', body: '업무를 시작하기 전에 필요한 사항을 확인합니다.' },
    { id: '00000000-0000-4000-8000-000000000002', title: '업무 인수인계', publisher: '직원', createdAt: '2026-01-01T00:00:00.000Z', body: '함께 일하는 사람에게 필요한 내용을 전달합니다.' },
  ];
}

export function searchLibraryFixtures(documents: FixtureDocument[], query: string): FixtureDocument[] {
  return documents.filter(document => document.title.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko')))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export const libraryDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
