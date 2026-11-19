import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureNext, fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export default async function SessionResume({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  const value = (await searchParams).next;
  const next = fixtureNext(Array.isArray(value) ? value[0] : value);
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  redirect(next);
}
