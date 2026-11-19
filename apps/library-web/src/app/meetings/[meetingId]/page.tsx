import { notFound } from 'next/navigation';
import { getFixtureMeeting } from '../../../fixture-meeting';
import { AttachMeetingForm, MeetingStageForm } from '../../../fixture-meeting-forms';

export const dynamic = 'force-dynamic';
export default async function MeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = getFixtureMeeting(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, meetingId);
  if (!meeting) notFound();
  return <main className="library-home"><article className="library-page library-page--reader"><header className="library-page__header"><h1>{meeting.title}</h1></header><AttachMeetingForm /><MeetingStageForm /></article></main>;
}
