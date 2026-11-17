import { LibrarySearch } from '../library-search';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 200) : '';
  return <main className="library-home"><section className="library-page" aria-label="홈"><LibrarySearch query={query} action="/" label="제목 검색" /><p className="library-empty">{query ? '검색 결과가 없습니다.' : '아직 게시물이 없습니다.'}</p></section></main>;
}
