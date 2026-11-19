import assert from 'node:assert/strict';
import test from 'node:test';
import { getLibraryFixtures, searchLibraryFixtures, getFixtureSource } from './library-fixture.ts';
import { getFixtureMeeting, MEETING_ID } from './fixture-meeting.ts';

test('only the explicitly enabled development meeting exists', () => {
  assert.equal(getFixtureMeeting('production', '1', MEETING_ID), null);
  assert.equal(getFixtureMeeting('development', undefined, MEETING_ID), null);
  assert.equal(getFixtureMeeting('development', '1', 'unknown'), null);
  assert.equal(getFixtureMeeting('development', '1', MEETING_ID)?.title, '업무 회의');
});

test('documents exist only with explicit development opt-in', () => {
  assert.deepEqual(getLibraryFixtures('production', '1'), []);
  assert.deepEqual(getLibraryFixtures('development', undefined), []);
  assert.equal(getLibraryFixtures('development', '1').length, 2);
});

test('title search is trimmed and sorted without searching document bodies', () => {
  const docs = getLibraryFixtures('development', '1');
  assert.deepEqual(searchLibraryFixtures(docs, '  운영  ').map(doc => doc.title), ['매장 운영 안내']);
  assert.deepEqual(searchLibraryFixtures(docs, '필요한'), []);
  assert.deepEqual(searchLibraryFixtures(docs, '').map(doc => doc.title), ['매장 운영 안내', '업무 인수인계']);
});

test('source download only returns a known opted-in fixture', () => {
  const document = getLibraryFixtures('development', '1')[0];
  assert.deepEqual(getFixtureSource('development', '1', document.id), { filename: `${document.title}.md`, body: document.body });
  assert.equal(getFixtureSource('production', '1', document.id), null);
  assert.equal(getFixtureSource('development', undefined, document.id), null);
  assert.equal(getFixtureSource('development', '1', 'unknown'), null);
});

test('public files are limited to matching opted-in development fixtures', async () => {
  const { getPublicFixture } = await import('./fixture-public-object.ts');
  const id = '00000000-0000-4000-8000-000000000005';
  assert.equal(getPublicFixture('production', '1', 'objects', id), null);
  assert.equal(getPublicFixture('development', undefined, 'objects', id), null);
  assert.equal(getPublicFixture('development', '1', 'documents', id), null);
  assert.equal(getPublicFixture('development', '1', 'objects', 'unknown'), null);
  assert.ok(getPublicFixture('development', '1', 'objects', id));
});
