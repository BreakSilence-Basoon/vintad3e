import assert from 'node:assert/strict';
import test from 'node:test';
import { eventOnDay, eventTimeOnDay, monthDays, monthEvents, moveMonth, parsePartnerEvents, seoulDate } from './partner-schedule.ts';
const event = { id: 'a', area: 'dj', title: '가상 DJ', startsAt: '2026-10-23T14:30:00.000Z', endsAt: '2026-10-23T16:00:00.000Z' };
test('calendar chips show the occupied KST interval per day without inventing unknown ends', () => {
  const row = parsePartnerEvents([event])![0];
  assert.equal(eventTimeOnDay(row, '2026-10-23'), '23:30 ~ 24:00');
  assert.equal(eventTimeOnDay(row, '2026-10-24'), '00:00 ~ 01:00');
  assert.equal(eventTimeOnDay({ ...row, endsAt: null }, '2026-10-23'), '23:30 · 종료 미정');
});
test('KST overnight events appear on both civil dates, midnight end is exclusive; unknown end is not invented', () => {
  const parsed = parsePartnerEvents([event])![0];
  assert.equal(seoulDate(event.startsAt), '2026-10-23');
  assert.equal(eventOnDay(parsed, '2026-10-23'), true);
  assert.equal(eventOnDay(parsed, '2026-10-24'), true);
  assert.equal(eventOnDay({ ...parsed, endsAt: '2026-10-23T15:00:00.000Z' }, '2026-10-24'), false);
  assert.equal(eventOnDay({ ...parsed, endsAt: null }, '2026-10-24'), false);
});
test('calendar covers leap day and complete weeks, month navigation crosses year safely', () => {
  assert.equal(monthDays('2024-02').includes('2024-02-29'), true);
  assert.equal(monthDays('2026-02').includes('2026-02-29'), false);
  assert.equal(monthDays('2026-10')[0], null);
  assert.equal(monthDays('2026-10').length % 7, 0);
  assert.equal(moveMonth('2026-12', 1), '2027-01');
  assert.equal(moveMonth('2026-01', -1), '2025-12');
  assert.equal(moveMonth('1900-01', -1), null);
  assert.equal(moveMonth('2199-12', 1), null);
  assert.deepEqual(monthDays('2026-13'), []);
});
test('month overlap and category filtering keep cross-month events once, not all DJ events', () => {
  const events = parsePartnerEvents([{ ...event, startsAt: '2026-09-30T14:00:00.000Z', endsAt: '2026-09-30T16:00:00.000Z' }, { ...event, id: 'b', area: 'rental' }, { ...event, id: 'c', startsAt: '2026-11-01T01:00:00.000Z', endsAt: null }])!;
  assert.deepEqual(monthEvents(events, '2026-10', 'dj').map(item => item.id), ['a']);
  assert.deepEqual(monthEvents(events, '2026-10').map(item => item.id), ['a', 'b']);
});
test('invalid/incomplete projection is unavailable rather than empty, strips source/identity and never mutates input', () => {
  assert.deepEqual(parsePartnerEvents([]), []);
  for (const value of [undefined, {}, [event, event], [{ ...event, area: 'clothing' }], [{ ...event, startsAt: '2026-02-30T01:00:00.000Z' }], [{ ...event, endsAt: event.startsAt }], [{ ...event, endsAt: undefined }], [{ ...event, title: '' }]]) assert.equal(parsePartnerEvents(value), null);
  const input = { ...event, sourceUrl: 'private-source', account: 'private', payout: 1000 };
  const before = structuredClone(input);
  assert.deepEqual(parsePartnerEvents([input]), [event]);
  assert.deepEqual(input, before);
});
