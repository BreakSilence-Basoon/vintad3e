export const MEETING_ID = '00000000-0000-4000-8000-000000000004';

export function getFixtureMeeting(env: string | undefined, enabled: string | undefined, id: string) {
  if (env !== 'development' || enabled !== '1' || id !== MEETING_ID) return null;
  return { id: MEETING_ID, title: '업무 회의' };
}
