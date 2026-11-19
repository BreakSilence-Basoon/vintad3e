import { notFound } from 'next/navigation';
import { DjAccountantMessage } from './dj-accountant-form';
import { SettlementLedger } from './settlement-ledger';
import { getDjFixture } from './partner-fixture';
import { seoulDate } from './partner-schedule';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_PARTNERS_FIXTURE !== '1') notFound();
  return <main className="staff-console"><div className="partners-settlement-page"><DjAccountantMessage /><SettlementLedger data={getDjFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()))} direction="payout" counterpartyLabel="DJ" /></div></main>;
}
