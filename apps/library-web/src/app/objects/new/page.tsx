import { ObjectUploadForm } from '../../../records-entry-forms';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export default async function NewObjectPage() {
  const fixture = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1';
  if (fixture) {
    const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
    if (!origin || host !== new URL(origin).host) notFound();
    if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fobjects%2Fnew');
  }
  return <main className="library-home"><section className="library-page" aria-label="파일 올리기"><ObjectUploadForm fixture={fixture} /></section></main>;
}
