type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type SyntheticMeeting = { id: string; title: string };
const slot = 'vintad3e:library-meetings';
export const meetingIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function readSyntheticMeetings(store: Store): SyntheticMeeting[] | null {
  try {
    const raw = store.getItem(slot); if (raw === null) return [];
    if (raw.length > 20000) return null;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 50) return null;
    const ids = new Set<string>();
    for (const row of value) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).sort().join(',') !== 'id,title' || typeof row.id !== 'string' || !meetingIdPattern.test(row.id) || ids.has(row.id) || typeof row.title !== 'string' || !row.title || row.title !== row.title.trim() || row.title.length > 255) return null;
      ids.add(row.id);
    }
    return value as SyntheticMeeting[];
  } catch { return null; }
}
export function addSyntheticMeeting(store: Store, meeting: SyntheticMeeting): boolean {
  const current = readSyntheticMeetings(store);
  if (!current || current.length >= 50 || !meetingIdPattern.test(meeting.id) || current.some(item => item.id === meeting.id) || !meeting.title || meeting.title !== meeting.title.trim() || meeting.title.length > 255) return false;
  try { store.setItem(slot, JSON.stringify([meeting, ...current])); return true; } catch { return false; }
}
