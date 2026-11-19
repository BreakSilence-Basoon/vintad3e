import { notFound } from 'next/navigation';
import { getPublicFixture } from '../../../../fixture-public-object';
import { FixturePublicViewer } from '../../../../fixture-public-viewer';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function PublicDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const document = getPublicFixture(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, 'documents', documentId);
  if (!document) notFound();
  return <main className="library-home"><article className="library-page library-page--reader"><h1 className="sr-only">문서</h1><FixturePublicViewer id={document.id} kind="documents" /></article></main>;
}
