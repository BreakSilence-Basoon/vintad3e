import { notFound, redirect } from 'next/navigation';
import { getFixtureObject, OBJECT_ID } from '../../../fixture-object';
import { internalDocumentId } from '../../../internal-document-fixture';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import { FixtureObjectViewer } from '../../../fixture-object-viewer';
import { headers } from 'next/headers';
import { getFixtureUpload } from '../../../fixture-upload.mjs';
import { fixtureUpload } from '../../../fixture-upload-spec.mjs';

export const dynamic = 'force-dynamic';
export default async function ObjectPage({ params, searchParams }: { params: Promise<{ objectId: string }>; searchParams: Promise<{ documentId?: string; view?: string }> }) {
  const { objectId } = await params;
  const { documentId, view } = await searchParams;
  if ((view !== undefined && (view !== 'corrected' || !documentId)) || (documentId !== undefined && (documentId !== internalDocumentId || objectId !== OBJECT_ID))) notFound();
  if (objectId !== OBJECT_ID && objectId !== fixtureUpload.id) notFound();
  const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
  if (!origin || host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(`/sign-in?next=${encodeURIComponent(`/objects/${objectId}`)}`);
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, objectId) ?? (objectId === fixtureUpload.id ? getFixtureUpload(requestHeaders.get('cookie'), host, process.env) : null);
  if (!object) notFound();
  return <main className="library-home"><article className="library-page library-page--reader"><header className="library-page__header"><h1>{object.filename}</h1></header><FixtureObjectViewer object={object} /></article></main>;
}
