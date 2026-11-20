import { CreateMeetingForm } from '../../records-entry-forms';
import { getFixtureMeeting, MEETING_ID } from '../../fixture-meeting';
import { SyntheticMeetingList } from '../../fixture-meeting-session';
import { requireFixtureLibraryStaff } from '../../fixture-staff-access';
export const dynamic = 'force-dynamic';
export default async function MeetingsPage() {
  await requireFixtureLibraryStaff('/meetings');
  const meeting = getFixtureMeeting(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, MEETING_ID);
  const failed = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1' && process.env.VINTAD3E_LIBRARY_MEETINGS_STATE === 'error';
  return <main className="library-home"><section className="library-page" aria-label="회의 기록"><CreateMeetingForm fixture={Boolean(meeting)} />{failed ? <p role="alert">회의 기록을 불러오지 못했습니다.</p> : meeting ? <SyntheticMeetingList fallback={meeting} /> : <p className="library-empty">회의 기록이 없습니다.</p>}</section></main>;
}
