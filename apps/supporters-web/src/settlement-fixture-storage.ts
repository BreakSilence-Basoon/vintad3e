export type FixturePayout = { paid: boolean; checkedDate: string | null };
export type FixturePayouts = Record<string, FixturePayout>;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const staffIds = new Set(['supporter-1', 'supporter-2']);
const monthPattern = /^(?:20\d{2})-(?:0[1-9]|1[0-2])$/;
const datePattern = /^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const key = (staff: string) => `vintad3e:settlement:${staff}`;

export function readFixturePayouts(storage: StorageLike, staff: string): FixturePayouts | null {
  if (!staffIds.has(staff)) return null;
  try {
    const raw = storage.getItem(key(staff));
    if (raw === null) return {};
    if (raw.length > 16000) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    if (entries.length > 120) return null;
    const result: FixturePayouts = {};
    for (const [month, value] of entries) {
      if (!monthPattern.test(month) || !value || typeof value !== 'object' || Array.isArray(value)) return null;
      const item = value as Record<string, unknown>;
      if (typeof item.paid !== 'boolean' || !(item.checkedDate === null || typeof item.checkedDate === 'string' && datePattern.test(item.checkedDate))) return null;
      result[month] = { paid: item.paid, checkedDate: item.checkedDate as string | null };
    }
    return result;
  } catch { return null; }
}

export function writeFixturePayout(storage: StorageLike, staff: string, month: string, paid: boolean, checkedDate: string): FixturePayouts | null {
  if (!staffIds.has(staff) || !monthPattern.test(month) || typeof paid !== 'boolean' || !datePattern.test(checkedDate)) return null;
  const current = readFixturePayouts(storage, staff);
  if (!current || (!Object.hasOwn(current, month) && Object.keys(current).length >= 120)) return null;
  const next = { ...current, [month]: { paid, checkedDate: paid ? checkedDate : null } };
  try { storage.setItem(key(staff), JSON.stringify(next)); return next; } catch { return null; }
}
