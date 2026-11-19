import { CreateMeetingForm } from '../../records-entry-forms';
import { getFixtureMeeting, MEETING_ID } from '../../fixture-meeting';
import { SyntheticMeetingList } from '../../fixture-meeting-session';
export const dynamic = 'force-dynamic';
export default function MeetingsPage() {
  const meeting = getFixtureMeeting(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, MEETING_ID);
  return <main className="library-home"><section className="library-page" aria-label="회의 기록"><CreateMeetingForm fixture={Boolean(meeting)} />{meeting ? <SyntheticMeetingList fallback={meeting} /> : <p className="library-empty">회의 기록이 없습니다.</p>}</section></main>;
}
