import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession, fixtureResumePath } from '../../../fixture-session.mjs';

export const dynamic = 'force-dynamic';

export default async function SessionResume({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const { next } = await searchParams;
  const target = fixtureResumePath(Array.isArray(next) ? next[0] : next);
  redirect(fixtureSession(requestHeaders.get('cookie'), host, process.env) ? target : '/sign-in');
}
