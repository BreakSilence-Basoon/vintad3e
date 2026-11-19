import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFixtureBookmarks, setFixtureBookmark } from './fixture-bookmarks.ts';
import { getLibraryFixtures } from './library-fixture.ts';

test('only known synthetic document IDs are accepted from tab storage', () => {
  const id = getLibraryFixtures('development', '1')[0].id;
  assert.deepEqual(parseFixtureBookmarks(JSON.stringify([id, id, 'other', 4])), [id]);
  assert.deepEqual(parseFixtureBookmarks('{'), []);
  assert.deepEqual(parseFixtureBookmarks('{}'), []);
  assert.deepEqual(parseFixtureBookmarks('x'.repeat(2049)), []);
});

test('bookmark writes preserve malformed, unknown and unavailable storage', () => {
  const id = getLibraryFixtures('development', '1')[0].id;
  let raw: string | null = null, blocked = false;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: { getItem: () => { if (blocked) throw new Error('unavailable'); return raw; }, setItem: (_key: string, value: string) => { raw = value; } }, dispatchEvent: () => true } });
  try {
    assert.equal(setFixtureBookmark(id, true), true);
    assert.deepEqual(JSON.parse(raw!), [id]);
    for (const value of ['{broken', '["unknown"]', JSON.stringify([id, id]), '{}']) { raw = value; assert.equal(setFixtureBookmark(id, false), false); assert.equal(raw, value); }
    raw = JSON.stringify([id]); blocked = true;
    assert.equal(setFixtureBookmark(id, false), false);
    assert.equal(raw, JSON.stringify([id]));
  } finally { if (old) Object.defineProperty(globalThis, 'window', old); else Reflect.deleteProperty(globalThis, 'window'); }
});
