import { getLibraryFixtures } from './library-fixture.ts';

export type FixtureComment = { id: string; body: string; createdAt: string };
const prefix = 'vintad3e-library-fixture-comments:';
const changedEvent = 'vintad3e-library-fixture-comments-changed';
const allowed = new Set([...getLibraryFixtures('development', '1').map(document => document.id), '00000000-0000-4000-8000-000000000004']);

export function parseFixtureComments(raw: string): FixtureComment[] {
  if (raw.length > 3_000_000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is FixtureComment => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[0-9a-f-]{36}$/.test(item.id) || seen.has(item.id) || typeof item.body !== 'string' || !item.body.trim() || item.body.length > 2000 || typeof item.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.createdAt) || !Number.isFinite(Date.parse(item.createdAt))) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 201).map(({ id, body, createdAt }) => ({ id, body, createdAt }));
  } catch { return []; }
}

export function commentSnapshot(id: string): string {
  if (!allowed.has(id)) return '[]';
  try { return window.sessionStorage.getItem(prefix + id) ?? '[]'; } catch { return '[]'; }
}
export function commentServerSnapshot(): string { return '[]'; }
export function subscribeComments(listener: () => void) {
  window.addEventListener(changedEvent, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(changedEvent, listener); window.removeEventListener('storage', listener); };
}
export function addFixtureComment(id: string, body: string): boolean {
  const text = body.trim();
  if (!allowed.has(id) || !text || text.length > 2000) return false;
  try {
    const key = prefix + id;
    const raw = window.sessionStorage.getItem(key) ?? '[]';
    if (raw.length > 3_000_000) return false;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 200) return false;
    const current = parseFixtureComments(raw);
    if (current.length !== value.length || value.some(item => Object.keys(item).sort().join(',') !== 'body,createdAt,id')) return false;
    const comment = { id: crypto.randomUUID(), body: text, createdAt: new Date().toISOString() };
    if (current.some(item => item.id === comment.id)) return false;
    window.sessionStorage.setItem(key, JSON.stringify([comment, ...current]));
    window.dispatchEvent(new Event(changedEvent));
    return true;
  } catch { return false; }
}
