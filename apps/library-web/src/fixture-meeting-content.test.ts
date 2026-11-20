import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFixtureMeetingChange, readFixtureMeetingContent, type MeetingChange } from './fixture-meeting-content.ts';
import { fixtureUpload } from './fixture-upload-spec.mjs';

test('meeting attachments and stages stay in supplied storage and validate parent stages', () => {
  const data = new Map<string, string>();
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const id = '00000000-0000-4000-8000-000000000004', other = '00000000-0000-4000-8000-000000000010', now = new Date('2026-01-02T03:00:00.000Z');
  const attach: MeetingChange = { kind: 'attach', objectId: fixtureUpload.id };
  assert.deepEqual(readFixtureMeetingContent(store, id), { attached: false, stages: [] });
  assert.equal(applyFixtureMeetingChange(store, id, attach, now)?.attached, true);
  assert.equal(applyFixtureMeetingChange(store, id, attach, now), null);
  const stage: MeetingChange = { kind: 'stage', objectId: fixtureUpload.id, step: 'TRANSCRIPT', title: '업무 회의', sourceKind: 'IMPORTED', sourceDetail: '회의 기록', parentRevision: null };
  assert.equal(applyFixtureMeetingChange(store, id, { ...stage, step: 'CORRECTED', parentRevision: 1 }, now), null);
  assert.equal(applyFixtureMeetingChange(store, id, stage, now)?.stages[0].revision, 1);
  assert.equal(applyFixtureMeetingChange(store, id, { ...stage, step: 'CORRECTED', parentRevision: 1 }, now)?.stages[1].revision, 1);
  assert.equal(readFixtureMeetingContent(store, other)?.stages.length, 0);
  assert.equal(applyFixtureMeetingChange(store, id, { ...stage, objectId: 'unknown' }, now), null);
  const key = [...data.keys()][0]; data.set(key, '{broken');
  assert.equal(readFixtureMeetingContent(store, id), null);
  assert.equal(applyFixtureMeetingChange(store, id, stage, now), null);
  assert.equal(data.get(key), '{broken');
  assert.equal(applyFixtureMeetingChange({ getItem: () => null, setItem: () => { throw new Error('unavailable'); } }, id, attach, now), null);
});
