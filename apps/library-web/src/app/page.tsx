import Link from 'next/link';
import { fixtureHome } from '../fixture-home';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 200) : '';
  const items = fixtureHome(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, query);
  const format = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' });
  return <main className="library-home library-home--feed"><section className="library-page" aria-label="홈"><nav aria-label="자료"><Link href="/meetings">회의 기록</Link> <Link href="/objects">파일</Link></nav>{items.length ? <ol className="library-feed">{items.map(item => <li key={item.id}><article className="library-post"><h2 className="library-post__title"><Link href={item.href}>{item.title}</Link></h2><div className="library-post__byline"><time dateTime={item.publishedAt}>{format.format(new Date(item.publishedAt))}</time>{item.publisher && item.publisher !== 'Notion' ? <><span className="library-post__separator" aria-hidden="true">·</span><span className="library-post__author">{item.publisher}</span></> : null}</div></article></li>)}</ol> : <p className="library-empty">{query ? '검색 결과가 없습니다.' : '아직 게시물이 없습니다.'}</p>}</section></main>;
}
