import assert from 'node:assert/strict';
import test from 'node:test';
import { getLibraryFixtures, searchLibraryFixtures } from './library-fixture.ts';

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
