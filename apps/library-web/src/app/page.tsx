import { LibrarySearch } from '../library-search';
import Link from 'next/link';
import { getLibraryFixtures, libraryDate, searchLibraryFixtures } from '../library-fixture';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 200) : '';
  const items = searchLibraryFixtures(getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE), query);
  return <main className="library-home"><section className="library-page" aria-label="홈"><nav aria-label="자료"><Link href="/meetings">회의 기록</Link> <Link href="/objects">파일</Link></nav><LibrarySearch query={query} action="/" label="제목 검색" />{items.length ? <ol className="library-feed">{items.map(item => <li key={item.id}><article><p className="library-document-meta"><span>{item.publisher}</span><time dateTime={item.createdAt}>{libraryDate(item.createdAt)}</time><span>Markdown</span></p><h2><Link href={`/publications/${item.id}`}>{item.title}</Link></h2></article></li>)}</ol> : <p className="library-empty">{query ? '검색 결과가 없습니다.' : '아직 게시물이 없습니다.'}</p>}</section></main>;
}
