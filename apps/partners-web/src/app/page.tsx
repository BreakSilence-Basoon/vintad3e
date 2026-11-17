import { PartnerCalendar } from '../partner-calendar';
import { seoulDate } from '../partner-schedule';
export const dynamic = 'force-dynamic';
export default function Page() { return <main className="staff-console"><header className="staff-page__header"><h1>협업·대관 일정</h1></header><PartnerCalendar data={{kind:'ready',events:[]}} today={seoulDate(new Date())} /></main>; }
