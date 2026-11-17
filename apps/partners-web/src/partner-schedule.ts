export const partnerAreas = [
  { id: 'dj', href: '/dj', label: 'DJ' },
  { id: 'proj-bedroom', href: '/proj-bedroom', label: 'proj.bedroom' },
  { id: 'rental', href: '/rental', label: '대관' },
] as const;
export type PartnerArea = typeof partnerAreas[number]['id'];
export type PartnerEvent = {
  id: string;
  area: PartnerArea;
  title: string;
  startsAt: string;
  endsAt: string | null;
  context?: string[];
};
export type CivilPartnerEvent = { id: string; area: PartnerArea; title: string; dateOnly: { from: string; through: string | null }; context?: string[] };
export type CalendarEvent = PartnerEvent | CivilPartnerEvent;
export type ScheduleRead = { kind: 'ready'; events: PartnerEvent[] }
  | { kind: 'partial'; events: CalendarEvent[]; undatedCount: number }
  | { kind: 'unavailable' | 'denied' };
const seoulDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function seoulDate(at: string | Date): string {
  const parts = Object.fromEntries(seoulDay.formatToParts(new Date(at)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function isCalendarMonth(value: string): boolean {
  return /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
}
export function moveMonth(month: string, delta: -1 | 1): string | null {
  if (!isCalendarMonth(month)) return null;
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  const result = date.toISOString().slice(0, 7);
  return isCalendarMonth(result) ? result : null;
}
export function monthDays(month: string): (string | null)[] {
  if (!isCalendarMonth(month)) return [];
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const total = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: total }, (_, index) => index < offset || index >= offset + count ? null : `${month}-${String(index - offset + 1).padStart(2, '0')}`);
}
export function eventDates(event: CalendarEvent): { first: string; last: string } {
  if ('dateOnly' in event) return { first: event.dateOnly.from, last: event.dateOnly.through ?? event.dateOnly.from };
  const first = seoulDate(event.startsAt);
  const last = event.endsAt === null ? first : seoulDate(new Date(Date.parse(event.endsAt) - 1));
  return { first, last };
}
export function eventOnDay(event: CalendarEvent, day: string): boolean {
  const { first, last } = eventDates(event);
  return day >= first && day <= last;
}
export function eventTimeOnDay(event: CalendarEvent, day: string): string {
  if ('dateOnly' in event) return '시간 미정';
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const from = seoulDate(event.startsAt) < day ? '00:00' : formatter.format(new Date(event.startsAt));
  if (event.endsAt === null) return `${from} · 종료 미정`;
  const to = seoulDate(event.endsAt) > day ? '24:00' : formatter.format(new Date(event.endsAt));
  return `${from} ~ ${to}`;
}
export function monthEvents<T extends CalendarEvent>(events: T[], month: string, area?: PartnerArea): T[] {
  const days = monthDays(month).filter((day): day is string => day !== null);
  if (!days.length) return [];
  return events.filter(event => {
    if (area && event.area !== area) return false;
    const { first, last } = eventDates(event);
    return first <= days.at(-1)! && last >= days[0];
  }).toSorted((a, b) => eventDates(a).first.localeCompare(eventDates(b).first) ||
    ('startsAt' in a ? a.startsAt : '').localeCompare('startsAt' in b ? b.startsAt : '') || a.id.localeCompare(b.id));
}
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
export function parsePartnerEvents(value: unknown): PartnerEvent[] | null {
  if (!Array.isArray(value) || value.length > 2000) return null;
  const result: PartnerEvent[] = [], ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !text(item.id) || ids.has(item.id) || !text(item.title) || !partnerAreas.some(area => area.id === item.area) || !instant(item.startsAt) || (item.endsAt !== null && (!instant(item.endsAt) || item.endsAt <= item.startsAt))) return null;
    ids.add(item.id);
    result.push({ id: item.id, title: item.title, area: item.area, startsAt: item.startsAt, endsAt: item.endsAt });
  }
  return result;
}
