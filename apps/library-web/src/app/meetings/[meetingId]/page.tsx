import { notFound } from 'next/navigation';
import { getFixtureMeeting } from '../../../fixture-meeting';
import { FixtureMeetingDetail } from '../../../fixture-meeting-forms';
import { meetingIdPattern } from '../../../fixture-meeting-storage';
import { SyntheticMeetingDetail } from '../../../fixture-meeting-session';
import { requireFixtureLibraryStaff } from '../../../fixture-staff-access';

export const dynamic = 'force-dynamic';
export default async function MeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  if (!meetingIdPattern.test(meetingId)) notFound();
  await requireFixtureLibraryStaff(`/meetings/${meetingId}`);
  const meeting = getFixtureMeeting(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, meetingId);
  if (!meeting) {
    if (process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1' && meetingIdPattern.test(meetingId)) return <SyntheticMeetingDetail id={meetingId} />;
    notFound();
  }
  return <FixtureMeetingDetail id={meeting.id} title={meeting.title} />;
}
