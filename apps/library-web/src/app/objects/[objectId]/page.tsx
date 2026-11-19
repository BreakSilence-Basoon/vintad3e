import { notFound } from 'next/navigation';
import { getFixtureObject } from '../../../fixture-object';
import { FixtureObjectViewer } from '../../../fixture-object-viewer';
import { headers } from 'next/headers';
import { getFixtureUpload } from '../../../fixture-upload.mjs';
import { fixtureUpload } from '../../../fixture-upload-spec.mjs';

export const dynamic = 'force-dynamic';
export default async function ObjectPage({ params, searchParams }: { params: Promise<{ objectId: string }>; searchParams: Promise<{ documentId?: string; view?: string }> }) {
  const { objectId } = await params;
  const { documentId, view } = await searchParams;
  const requestHeaders = objectId === fixtureUpload.id ? await headers() : null;
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, objectId) ?? (objectId === fixtureUpload.id && requestHeaders ? getFixtureUpload(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env) : null);
  if (!object || documentId !== undefined || view !== undefined) notFound();
  return <main className="library-home"><article className="library-page library-page--reader"><header className="library-page__header"><h1>{object.filename}</h1></header><FixtureObjectViewer object={object} /></article></main>;
}
