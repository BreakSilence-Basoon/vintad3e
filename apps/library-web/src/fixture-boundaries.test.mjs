import test from 'node:test';
import assert from 'node:assert/strict';
import { getFixtureSource, getLibraryFixtures, searchLibraryFixtures } from './library-fixture.ts';
import { searchFixture } from './library-search-fixture.ts';
import { getFixtureMembers, searchFixtureMembers } from './fixture-members.ts';
import { parseFixtureBookmarks } from './fixture-bookmarks.ts';
import { addSyntheticMeeting, readSyntheticMeetings } from './fixture-meeting-storage.ts';
import { parsePublicationHtml, publicationLink } from './fixture-publication-content.ts';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; }

test('document fixtures and searches handle disabled, empty and unmatched data', () => {
  const docs = getLibraryFixtures('development', '1');
  assert.equal(docs.length, 2);
  assert.deepEqual(getLibraryFixtures('production', '1'), []);
  assert.deepEqual(searchLibraryFixtures([], ''), []);
  assert.deepEqual(searchLibraryFixtures(docs, '없는 문서'), []);
  assert.ok(getFixtureSource('development', '1', docs[0].id));
  assert.equal(getFixtureSource('development', '1', 'unknown'), null);
});

test('synthetic search validates limits and preserves empty results', () => {
  const now = Date.parse('2026-01-03T00:00:00Z');
  assert.ok(searchFixture('development', '1', '', 'all', '', now).results.length);
  assert.deepEqual(searchFixture('development', '1', '없는 문서', 'all', '', now).results, []);
  assert.equal(searchFixture('production', '1', '', 'all', '', now), null);
  assert.equal(searchFixture('development', '1', 'x'.repeat(101), 'all', '', now), null);
  assert.equal(searchFixture('development', '1', '', 'unknown', '', now), null);
  assert.equal(searchFixture('development', '1', '', 'all', '', NaN), null);
});

test('synthetic member and bookmark readers handle empty and malformed input', () => {
  const members = getFixtureMembers('development', '1');
  assert.equal(searchFixtureMembers(members, ' 직원 ').length, 1);
  assert.deepEqual(searchFixtureMembers([], ''), []);
  assert.deepEqual(searchFixtureMembers(members, '없는 사람'), []);
  assert.deepEqual(parseFixtureBookmarks(''), []);
  assert.deepEqual(parseFixtureBookmarks('{}'), []);
  assert.deepEqual(parseFixtureBookmarks('["unknown"]'), []);
  const id = '00000000-0000-4000-8000-000000000001';
  assert.deepEqual(parseFixtureBookmarks(JSON.stringify([id, id])), [id]);
});

test('meeting storage rejects invalid or corrupt records without overwriting', () => {
  const store = memory(), slot = 'vintad3e:library-meetings';
  assert.deepEqual(readSyntheticMeetings(store), []);
  assert.equal(addSyntheticMeeting(store, { id: 'bad', title: '예시' }), false);
  const meeting = { id: '00000000-0000-4000-8000-000000000010', title: '예시 회의' };
  assert.equal(addSyntheticMeeting(store, meeting), true);
  assert.deepEqual(readSyntheticMeetings(store), [meeting]);
  store.setItem(slot, '{bad');
  assert.equal(addSyntheticMeeting(store, meeting), false);
  assert.equal(store.getItem(slot), '{bad');
});

test('publication parsing rejects unsafe links and strips scripts', () => {
  assert.equal(publicationLink('javascript:alert(1)', 'fixture', []), undefined);
  assert.equal(publicationLink('', 'fixture', []), undefined);
  assert.equal(publicationLink('https://example.invalid/path', 'fixture', []), 'https://example.invalid/path');
  const text = JSON.stringify(parsePublicationHtml('<p>예시</p><script>danger()</script>', 'fixture', []));
  assert.match(text, /예시/); assert.doesNotMatch(text, /danger/);
});

test('sign-in notices handle missing and prototype-like values', () => {
  assert.equal(fixtureSignInNotice(''), null); assert.equal(fixtureSignInNotice(null), null);
  assert.ok(fixtureSignInNotice('AccessDenied')?.title);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
