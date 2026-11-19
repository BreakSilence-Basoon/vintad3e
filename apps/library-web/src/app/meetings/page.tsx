import { CreateMeetingForm } from '../../records-entry-forms';
export const dynamic = 'force-dynamic';
export default function MeetingsPage() {
  return <main className="library-home"><section className="library-page" aria-label="회의 기록"><CreateMeetingForm /><p className="library-empty">회의 기록이 없습니다.</p></section></main>;
}
