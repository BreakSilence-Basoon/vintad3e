type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type Platform = 'instagram' | 'tiktok';
const allowed = new Set(['instagram-1', 'instagram-2', 'tiktok-1', 'tiktok-2']);
const registrationsSlot = 'vintad3e:sns-registrations';
const connectionSlot = (platform: Platform) => `vintad3e:sns-connection:${platform}`;
const syncSlot = (platform: Platform) => `vintad3e:sns-sync:${platform}`;
const validTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function readSync(store: Store, platform: Platform): string | null {
  if (platform !== 'instagram' && platform !== 'tiktok') return null;
  try { const value = store.getItem(syncSlot(platform)); return value && validTime(value) ? value : null; } catch { return null; }
}
export function writeSync(store: Store, platform: Platform, now: Date): string | null {
  if (platform !== 'instagram' && platform !== 'tiktok') return null;
  try {
    const old = store.getItem(syncSlot(platform));
    if (old !== null && !validTime(old)) return null;
    const value = now.toISOString(); store.setItem(syncSlot(platform), value); return value;
  } catch { return null; }
}
export function readRegistrations(store: Store): Record<string, boolean> | null {
  try {
    const raw = store.getItem(registrationsSlot);
    if (raw === null) return {};
    if (raw.length > 1024) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    if (entries.some(([id, value]) => !allowed.has(id) || typeof value !== 'boolean')) return null;
    return Object.fromEntries(entries);
  } catch { return null; }
}
export function writeRegistration(store: Store, id: string, registered: boolean): boolean {
  if (!allowed.has(id) || typeof registered !== 'boolean') return false;
  const current = readRegistrations(store);
  if (!current) return false;
  try { store.setItem(registrationsSlot, JSON.stringify({ ...current, [id]: registered })); return true; } catch { return false; }
}
export function readConnection(store: Store, platform: Platform): boolean | null {
  if (platform !== 'instagram' && platform !== 'tiktok') return null;
  try { const raw = store.getItem(connectionSlot(platform)); return raw === null || raw === 'connected' ? true : raw === 'disconnected' ? false : null; } catch { return null; }
}
export function writeConnection(store: Store, platform: Platform, connected: boolean): boolean {
  if ((platform !== 'instagram' && platform !== 'tiktok') || typeof connected !== 'boolean' || readConnection(store, platform) === null) return false;
  try { store.setItem(connectionSlot(platform), connected ? 'connected' : 'disconnected'); return true; } catch { return false; }
}
