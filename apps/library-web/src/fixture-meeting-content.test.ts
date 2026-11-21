import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFixtureMeetingChange, readFixtureMeetingContent, type MeetingChange } from './fixture-meeting-content.ts';
import { fixtureCorrectedUpload, fixtureUpload } from './fixture-upload-spec.mjs';

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
  assert.equal(applyFixtureMeetingChange(store, id, { ...stage, objectId: fixtureCorrectedUpload.id, step: 'CORRECTED', parentRevision: 1 }, now)?.stages[1].revision, 1);
  assert.equal(readFixtureMeetingContent(store, other)?.stages.length, 0);
  assert.equal(applyFixtureMeetingChange(store, id, { ...stage, objectId: 'unknown' }, now), null);
  const key = [...data.keys()][0]; data.set(key, '{broken');
  assert.equal(readFixtureMeetingContent(store, id), null);
  assert.equal(applyFixtureMeetingChange(store, id, stage, now), null);
  assert.equal(data.get(key), '{broken');
  assert.equal(applyFixtureMeetingChange({ getItem: () => null, setItem: () => { throw new Error('unavailable'); } }, id, attach, now), null);
});

test('each meeting stage accepts the three source kinds and requires its preceding stage', () => {
  const data = new Map<string, string>();
  const store = { getItem: (name: string) => data.get(name) ?? null, setItem: (name: string, value: string) => { data.set(name, value); } };
  const id = '00000000-0000-4000-8000-000000000004', now = new Date('2026-01-02T03:00:00.000Z');
  const base = { kind: 'stage', objectId: fixtureUpload.id, title: '회의 기록', sourceDetail: '회의 내용' } as const;
  for (const sourceKind of ['IMPORTED', 'HUMAN', 'AI'] as const) {
    assert.equal(applyFixtureMeetingChange(store, id, { ...base, sourceKind, step: 'SUMMARY', parentRevision: 999 }, now), null);
    assert.ok(applyFixtureMeetingChange(store, id, { ...base, sourceKind, step: 'TRANSCRIPT', parentRevision: null }, now));
    assert.ok(applyFixtureMeetingChange(store, id, { ...base, sourceKind, step: 'CORRECTED', parentRevision: 1 }, now));
    assert.ok(applyFixtureMeetingChange(store, id, { ...base, sourceKind, step: 'SUMMARY', parentRevision: 1 }, now));
  }
  const stages = readFixtureMeetingContent(store, id)?.stages;
  assert.equal(stages?.length, 9);
  assert.deepEqual(stages?.map(stage => stage.sourceKind), ['IMPORTED', 'IMPORTED', 'IMPORTED', 'HUMAN', 'HUMAN', 'HUMAN', 'AI', 'AI', 'AI']);
});

test('meeting stage rejects invalid text and parents without replacing saved content', () => {
  const data = new Map<string, string>();
  const store = { getItem: (name: string) => data.get(name) ?? null, setItem: (name: string, value: string) => { data.set(name, value); } };
  const id = '00000000-0000-4000-8000-000000000004', now = new Date('2026-01-02T03:00:00.000Z');
  const stage: MeetingChange = { kind: 'stage', objectId: fixtureUpload.id, step: 'TRANSCRIPT', title: '가'.repeat(255), sourceKind: 'IMPORTED', sourceDetail: '나'.repeat(500), parentRevision: null };
  assert.ok(applyFixtureMeetingChange(store, id, stage, now));
  const saved = [...data.values()][0];
  for (const invalid of [
    { ...stage, title: '' }, { ...stage, title: ' 가' }, { ...stage, title: '가'.repeat(256) },
    { ...stage, sourceDetail: '' }, { ...stage, sourceDetail: '나'.repeat(501) },
    { ...stage, title: '가\n나' }, { ...stage, parentRevision: 1 },
  ]) assert.equal(applyFixtureMeetingChange(store, id, invalid, now), null);
  assert.equal([...data.values()][0], saved);
});
