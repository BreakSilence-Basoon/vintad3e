import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureHome } from '../fixture-home';
import { FixtureHomeFeed } from '../fixture-home-feed';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  if (process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1') {
    const origin = fixtureOrigin(process.env);
    if (!origin) notFound();
    const requestHeaders = await headers();
    const host = requestHeaders.get('host');
    if (host !== new URL(origin).host) notFound();
    if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2F');
  }
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 200) : '';
  const items = fixtureHome(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, query);
  return <main className="library-home library-home--feed"><section className="library-page" aria-label="홈"><nav aria-label="자료"><Link href="/meetings">회의 기록</Link> <Link href="/objects">파일</Link></nav><FixtureHomeFeed items={items} query={query} fixture={process.env.NODE_ENV==='development'&&process.env.VINTAD3E_LIBRARY_FIXTURE==='1'} /></section></main>;
}
