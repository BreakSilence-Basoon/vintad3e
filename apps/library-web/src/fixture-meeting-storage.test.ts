import test from 'node:test';
import assert from 'node:assert/strict';
import { addSyntheticMeeting, readSyntheticMeetings } from './fixture-meeting-storage.ts';
import './fixture-meeting-content.test.ts';

test('synthetic meetings are validated and kept only in the supplied storage', () => {
  let raw: string | null = null;
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const meeting = { id: '00000000-0000-4000-8000-000000000010', title: '업무 회의' };
  assert.deepEqual(readSyntheticMeetings(store), []);
  assert.equal(addSyntheticMeeting(store, meeting), true);
  assert.deepEqual(readSyntheticMeetings(store), [meeting]);
  assert.equal(addSyntheticMeeting(store, meeting), false);
  assert.equal(addSyntheticMeeting(store, { ...meeting, id: 'bad' }), false);
  assert.equal(addSyntheticMeeting(store, { ...meeting, title: '  ' }), false);
  raw = '{broken'; assert.equal(readSyntheticMeetings(store), null); assert.equal(addSyntheticMeeting(store, meeting), false);
  assert.equal(addSyntheticMeeting({ getItem: () => null, setItem: () => { throw new Error('unavailable'); } }, meeting), false);
});
