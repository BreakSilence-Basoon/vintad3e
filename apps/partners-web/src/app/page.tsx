import { PartnerCalendar } from '../partner-calendar';
import { requireFixturePartnersStaff } from '../fixture-staff-access';
import { seoulDate } from '../partner-schedule';
import { getPartnerFixture } from '../partner-fixture';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireFixturePartnersStaff('/'); const today = seoulDate(new Date()); const { schedule } = getPartnerFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, today); return <main className="staff-console"><header className="staff-page__header"><h1>협업·대관 일정</h1></header><PartnerCalendar data={schedule} today={today} /></main>; }
