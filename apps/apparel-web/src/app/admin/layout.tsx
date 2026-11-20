import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';

export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'development' && process.env.VINTAD3E_APPAREL_FIXTURE === '1') {
    const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
    if (!origin || host !== new URL(origin).host) notFound();
    if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fadmin');
  }
  return children;
}
