import { notFound } from 'next/navigation';
import { getLibraryFixtures } from '../../../library-fixture';
import { FixtureCommunity } from '../../../fixture-community';
import { FixturePublishedDocument } from '../../../fixture-published-document';
import { LibraryDocumentInfo } from '../../../library-document-info';
import { LibraryReaderTools } from '../../../library-reader-tools';

export const dynamic = 'force-dynamic';
export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1' && id === '00000000-0000-4000-8000-000000000004') return <FixturePublishedDocument />;
  const document = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE).find(item => item.id === id);
  if (!document) notFound();
  return <main className="library-home"><section className="library-page library-page--reader"><header className="library-page__header"><h1>{document.title}</h1><p className="library-reader-byline"><span>{document.publisher}</span><span aria-hidden="true">·</span> {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(document.createdAt))}</p></header><LibraryReaderTools /><article className="publication-content"><p>{document.body}</p></article><LibraryDocumentInfo><dl><div><dt>형식</dt><dd>Markdown</dd></div><div><dt>등록 날짜</dt><dd><time dateTime={document.createdAt}>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(document.createdAt))}</time></dd></div></dl></LibraryDocumentInfo><div className="publication-actions"><a href={`/api/publications/${document.id}/source`}>원본 다운로드</a></div><FixtureCommunity document={document} /></section></main>;
}
