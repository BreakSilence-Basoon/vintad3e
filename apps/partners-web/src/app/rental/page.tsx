import { SettlementLedger } from '../../settlement-ledger';
import { getPartnerFixture } from '../../partner-fixture';
import { seoulDate } from '../../partner-schedule';

export const dynamic = 'force-dynamic';
export default function Page() {
  const { ledger } = getPartnerFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()));
  return <main className="staff-console"><div className="partners-settlement-page"><SettlementLedger data={ledger} direction="collection" counterpartyLabel="대관처" /></div></main>;
}
