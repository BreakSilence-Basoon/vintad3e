import { getLibraryFixtures } from './library-fixture.ts';

const key = 'vintad3e-library-fixture-bookmarks';
const changedEvent = 'vintad3e-library-fixture-bookmarks-changed';
const allowed = new Set([...getLibraryFixtures('development', '1').map(document => document.id), '00000000-0000-4000-8000-000000000004']);

export function parseFixtureBookmarks(raw: string): string[] {
  if (raw.length > 2048) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.has(id)))];
  } catch { return []; }
}

export function bookmarkSnapshot(): string {
  try { return window.sessionStorage.getItem(key) ?? '[]'; } catch { return '[]'; }
}
export function bookmarkServerSnapshot(): string { return '[]'; }
export function subscribeBookmarks(listener: () => void) {
  window.addEventListener(changedEvent, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(changedEvent, listener); window.removeEventListener('storage', listener); };
}
export function setFixtureBookmark(id: string, saved: boolean): boolean {
  if (!allowed.has(id)) return false;
  try {
    const raw = window.sessionStorage.getItem(key) ?? '[]';
    if (raw.length > 2048) return false;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !allowed.has(item)) || new Set(value).size !== value.length) return false;
    const ids = new Set<string>(value);
    if (saved) ids.add(id); else ids.delete(id);
    window.sessionStorage.setItem(key, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(changedEvent));
    return true;
  } catch { return false; }
}
