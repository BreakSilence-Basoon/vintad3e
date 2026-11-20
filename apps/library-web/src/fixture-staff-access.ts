import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureNext, fixtureOrigin, fixtureSession } from './fixture-session.mjs';

export async function requireFixtureLibraryStaff(next: string) {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_LIBRARY_FIXTURE !== '1') return;
  const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
  if (!origin || host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(`/sign-in?${new URLSearchParams({ next: fixtureNext(next) })}`);
}
