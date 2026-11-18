import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLibraryFixtures } from '../../../library-fixture';
import { FixtureCommunity } from '../../../fixture-community';

export const dynamic = 'force-dynamic';
export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE).find(item => item.id === id);
  if (!document) notFound();
  return <main className="library-home"><section className="library-page"><nav><Link href="/">홈</Link></nav><header className="library-page__header"><h1>{document.title}</h1><p className="library-document-meta">발행자 {document.publisher} · {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(document.createdAt))}</p></header><article className="publication-content"><p>{document.body}</p></article><FixtureCommunity document={document} /></section></main>;
}
