import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import { FixturePublicationConfirmation } from '../../../fixture-publication-confirmation';
import { FixtureObjectConfirmation } from '../../../fixture-object-confirmation-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Library > 변경 확인', robots: { index: false, follow: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const origin = fixtureOrigin(process.env);
  const objectProposal = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(proposalId);
  if (!origin || (proposalId !== 'proposal-01' && !objectProposal)) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect(`/sign-in?next=${encodeURIComponent(`/confirmations/${proposalId}`)}`);
  return <main className="library-home"><section className="library-page"><h1>발행 내용 확인</h1>{objectProposal ? <FixtureObjectConfirmation proposalId={proposalId} /> : <FixturePublicationConfirmation />}</section></main>;
}
