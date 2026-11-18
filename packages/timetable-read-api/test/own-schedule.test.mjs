import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOwnScheduleHandler } from '../src/index.mjs';

const from = '2026-01-01T00:00:00.000Z', to = '2026-01-02T00:00:00.000Z';
const query = new URLSearchParams({ from, to });
const url = `https://app.example.invalid/v1/me/shifts?${query}`;
const identity = { issuer: 'https://identity.example.invalid', subject: 'example-user' };
const shift = { id: 'shift-a', locationId: 'location-a', locationLabel: 'Example location', startsAt: '2026-01-01T09:00:00.000Z', endsAt: '2026-01-01T17:00:00.000Z', graceMinutes: 0 };

test('returns only approved fields and passes the verified identity and bounded range', async () => {
  const handler = createOwnScheduleHandler({ verifyAuthorization: async () => identity,
    findOwnShifts: async (issuer, subject, start, end, cursor, limit) => {
      assert.deepEqual([issuer, subject, start, end, cursor, limit], [identity.issuer, identity.subject, from, to, null, 51]);
      return [{ ...shift, privateExtra: 'synthetic-extra' }];
    } });
  const response = await handler(new Request(url));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { shifts: [{ id: 'shift-a', location: { id: 'location-a', label: 'Example location' }, startsAt: shift.startsAt, endsAt: shift.endsAt, graceMinutes: 0 }], nextCursor: null });
});

test('rejects invalid query, identity and stored data without exposing errors', async () => {
  const handler = createOwnScheduleHandler({ verifyAuthorization: async () => identity, findOwnShifts: async () => [{ ...shift, endsAt: 'invalid' }] });
  assert.equal((await handler(new Request(`${url}&cursor=invalid`))).status, 400);
  assert.equal((await handler(new Request(`${url}&from=${encodeURIComponent(from)}`))).status, 400);
  assert.equal((await handler(new Request(url))).status, 503);
  const missing = createOwnScheduleHandler({ verifyAuthorization: async () => null, findOwnShifts: async () => [] });
  assert.equal((await missing(new Request(url))).status, 401);
  const inactive = createOwnScheduleHandler({ verifyAuthorization: async () => identity, findOwnShifts: async () => null });
  assert.equal((await inactive(new Request(url))).status, 404);
});

test('linked attendance is opt-in, projected narrowly, and fails closed on inconsistent links', async () => {
  let row = { ...shift, attendanceRecordId: 'record-a', attendanceStartsAt: '2026-01-01T09:05:00.000Z', attendanceEndsAt: null, privateExtra: 'omit' };
  const handler = createOwnScheduleHandler({ verifyAuthorization: async () => identity, findOwnShifts: async (...args) => { assert.equal(args[7], true); return [row]; } });
  const requested = `${url}&include=attendance`;
  const response = await handler(new Request(requested));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).shifts[0].attendance, { startsAt: '2026-01-01T09:05:00.000Z', endsAt: null });
  row = { ...row, attendanceRecordId: null, attendanceStartsAt: null, attendanceEndsAt: null };
  assert.equal((await (await handler(new Request(requested))).json()).shifts[0].attendance, null);
  row = { ...row, attendanceRecordId: 'record-a' };
  assert.equal((await handler(new Request(requested))).status, 503);
  assert.equal((await handler(new Request(`${url}&include=other`))).status, 400);
  assert.equal((await handler(new Request(`${requested}&include=attendance`))).status, 400);
});
