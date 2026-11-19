const key = 'vintad3e-apparel-fixture-pos-sync';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const valid = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function readFixtureSync(storage: StoragePort): string | null {
  try { const value = storage.getItem(key); return value && valid(value) ? value : null; } catch { return null; }
}
export function writeFixtureSync(storage: StoragePort, now: Date): string | null {
  try {
    const old = storage.getItem(key);
    if (old !== null && !valid(old)) return null;
    const value = now.toISOString();
    storage.setItem(key, value);
    return value;
  } catch { return null; }
}
