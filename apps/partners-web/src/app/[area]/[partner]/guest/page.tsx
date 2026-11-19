import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { bedroomFixture } from '../../../../bedroom-fixture';
import { seoulDate } from '../../../../partner-schedule';
import { FixtureGuest } from '../../../../fixture-guest';
import { guestOrigin, guestSession } from '../../../../guest-session.mjs';
import '../../../../guest-shell-original.css';
import '../../../../guest-records-original.css';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ area: string; partner: string }> }) {
  const { area, partner } = await params;
  if (area !== 'proj-bedroom') notFound();
  const today = seoulDate(new Date());
  const fixture = bedroomFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, today, partner);
  if (!fixture || fixture.ledger.kind !== 'ready') notFound();
  const requestHeaders = await headers();
  const origin = guestOrigin(process.env);
  if (!origin || requestHeaders.get('host') !== new URL(origin).host) notFound();
  if (!guestSession(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env, partner)) redirect(`/proj-bedroom/${partner}/sign-in`);
  return <FixtureGuest id={partner} name={fixture.partner.name} amount={fixture.ledger.rows[0].amount ?? '0'} paid={fixture.ledger.rows[0].status === 'COMPLETED'} today={today} />;
}
