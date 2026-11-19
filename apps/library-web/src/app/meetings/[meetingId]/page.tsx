import { notFound } from 'next/navigation';
import { getFixtureMeeting } from '../../../fixture-meeting';
import { AttachMeetingForm, MeetingStageForm } from '../../../fixture-meeting-forms';
import { meetingIdPattern } from '../../../fixture-meeting-storage';
import { SyntheticMeetingDetail } from '../../../fixture-meeting-session';

export const dynamic = 'force-dynamic';
export default async function MeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = getFixtureMeeting(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, meetingId);
  if (!meeting) {
    if (process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1' && meetingIdPattern.test(meetingId)) return <SyntheticMeetingDetail id={meetingId} />;
    notFound();
  }
  return <main className="library-home"><article className="library-page library-page--reader"><header className="library-page__header"><h1>{meeting.title}</h1></header><AttachMeetingForm /><MeetingStageForm /></article></main>;
}
