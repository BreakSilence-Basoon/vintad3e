import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureActivity } from './fixture-activity.ts';
import { getLibraryFixtures } from './library-fixture.ts';

test('activity shows fixture documents and their comments by most recent date', () => {
  const docs = getLibraryFixtures('development', '1');
  const first = { id: '00000000-0000-4000-8000-000000000001', body: '첫 댓글', createdAt: '2026-11-18T00:00:00.000Z' };
  const second = { id: '00000000-0000-4000-8000-000000000002', body: '둘째 댓글', createdAt: '2026-11-19T00:00:00.000Z' };
  const activity = fixtureActivity(docs, [JSON.stringify([first]), JSON.stringify([second])]);
  assert.deepEqual(activity.documents.map(item => item.id), docs.map(item => item.id));
  assert.deepEqual(activity.comments.map(item => [item.publicationId, item.body]), [[docs[1].id, second.body], [docs[0].id, first.body]]);
  assert.deepEqual(fixtureActivity([], [JSON.stringify([first])]).comments, []);
});

test('activity reports when the combined comments exceed 200', () => {
  const docs = getLibraryFixtures('development', '1');
  const records = Array.from({ length: 101 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, body: '댓글', createdAt: '2026-11-18T00:00:00.000Z' }));
  const activity = fixtureActivity(docs, [JSON.stringify(records), JSON.stringify(records)]);
  assert.equal(activity.comments.length, 200);
  assert.equal(activity.hasMoreComments, true);
  const oneDocument = fixtureActivity([docs[0]], [JSON.stringify([...records, ...records.slice(0, 100).map((item, index) => ({ ...item, id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}` }))])]);
  assert.equal(oneDocument.comments.length, 200);
  assert.equal(oneDocument.hasMoreComments, true);
});
