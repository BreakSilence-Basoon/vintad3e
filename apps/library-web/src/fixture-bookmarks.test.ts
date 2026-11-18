import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFixtureBookmarks } from './fixture-bookmarks.ts';
import { getLibraryFixtures } from './library-fixture.ts';

test('only known synthetic document IDs are accepted from tab storage', () => {
  const id = getLibraryFixtures('development', '1')[0].id;
  assert.deepEqual(parseFixtureBookmarks(JSON.stringify([id, id, 'other', 4])), [id]);
  assert.deepEqual(parseFixtureBookmarks('{'), []);
  assert.deepEqual(parseFixtureBookmarks('{}'), []);
  assert.deepEqual(parseFixtureBookmarks('x'.repeat(2049)), []);
});
