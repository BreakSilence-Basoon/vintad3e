export type OnlineChecklist = { seongsuPicked: boolean; hanamPrepared: boolean };
const key = 'vintad3e-apparel-fixture-online-checklist';
function parse(raw: string | null): OnlineChecklist | null {
  if (raw === null) return { seongsuPicked: false, hanamPrepared: false };
  if (raw.length > 256) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'hanamPrepared,seongsuPicked' || typeof record.seongsuPicked !== 'boolean' || typeof record.hanamPrepared !== 'boolean') return null;
    return { seongsuPicked: record.seongsuPicked, hanamPrepared: record.hanamPrepared };
  } catch { return null; }
}
export function readOnlineChecklist(storage: Storage): OnlineChecklist | null {
  try { return parse(storage.getItem(key)); } catch { return null; }
}
export function saveOnlineChecklist(storage: Storage, value: OnlineChecklist): boolean {
  try {
    if (!readOnlineChecklist(storage) || !parse(JSON.stringify(value))) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}
