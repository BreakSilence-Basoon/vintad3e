import { notFound } from 'next/navigation';
import { getPublicFixture } from '../../../../fixture-public-object';
import { FixturePublicViewer } from '../../../../fixture-public-viewer';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function PublicObjectPage({ params }: { params: Promise<{ objectId: string }> }) {
  const { objectId } = await params;
  const object = getPublicFixture(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, 'objects', objectId);
  if (!object) notFound();
  return <main className="library-home"><article className="library-page library-page--reader"><h1 className="sr-only">파일</h1><FixturePublicViewer id={object.id} kind="objects" /></article></main>;
}
