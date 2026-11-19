import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import { FixtureConfirmationView } from '../../../fixture-confirmation-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 변경 확인', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const origin = fixtureOrigin(process.env);
  if (!origin || proposalId !== 'proposal-01') notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fconfirmations%2Fproposal-01');
  return <FixtureConfirmationView proposalId={proposalId} />;
}
