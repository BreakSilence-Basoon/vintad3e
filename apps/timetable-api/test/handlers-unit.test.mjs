import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminStaffList } from '../src/admin-staff-list.mjs';
import { createAdminScheduleList } from '../src/admin-schedule-list.mjs';
import { createAdminHandler } from '../src/admin-handler.mjs';
import { createLoopbackServer } from '../src/server.mjs';
import { initializeNewDatabase } from '../src/init-db.mjs';

const identity = { issuer: 'https://identity.example.invalid', subject: 'example', issuedAt: 100 };
const verifyWriteAuthorization = async (auth) => auth === 'Bearer example' ? identity : null;
function database(rows) {
  return { prepare(sql) { return sql.startsWith('PRAGMA') ? { get: () => ({ user_version: 10 }) } : { all: () => rows, get: () => rows[0] }; } };
}
function request(path, { method = 'GET', auth = true, body, contentType } = {}) {
  return new Request(`http://127.0.0.1${path}`, { method, headers: { ...(auth ? { authorization: 'Bearer example' } : {}), ...(contentType ? { 'content-type': contentType } : {}) }, ...(body === undefined ? {} : { body }) });
}
const range = '?from=2026-01-01T00%3A00%3A00.000Z&to=2026-01-02T00%3A00%3A00.000Z';

test('staff list returns normal and empty lists without a network', async () => {
  const rows = [{ id: 'example', memberships: 1, role: 'VIEWER', active: 1 }];
  const response = await createAdminStaffList({ db: database(rows), verifyWriteAuthorization })(request('/v1/admin/staff'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { staff: [{ id: 'example', role: 'VIEWER', status: 'active' }], nextCursor: null });
  const empty = await createAdminStaffList({ db: database([{ id: null }]), verifyWriteAuthorization })(request('/v1/admin/staff'));
  assert.deepEqual(await empty.json(), { staff: [], nextCursor: null });
});

test('staff list rejects invalid query and missing authorization', async () => {
  const handle = createAdminStaffList({ db: database([]), verifyWriteAuthorization });
  for (const query of ['?limit=0', '?limit=101', '?limit=1&limit=2', '?cursor=', '?unknown=1']) assert.equal((await handle(request('/v1/admin/staff' + query))).status, 400);
  assert.equal((await handle(request('/v1/admin/staff', { auth: false }))).status, 401);
  assert.equal((await handle(request('/v1/admin/staff', { method: 'POST' }))).status, 404);
});

test('schedule list returns a synthetic shift and an empty authorized list', async () => {
  const row = { id: 'shift-a', staffId: 'staff-a', locationId: 'location-a', locationLabel: '예시', startsAt: '2026-01-01T09:00:00.000Z', endsAt: '2026-01-01T10:00:00.000Z', graceMinutes: 0, revision: 1, active: 1 };
  const response = await createAdminScheduleList({ db: database([row]), verifyWriteAuthorization })(request('/v1/admin/shifts' + range));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.shifts[0].id, 'shift-a'); assert.equal(body.shifts[0].active, true);
  const empty = await createAdminScheduleList({ db: database([{ id: null }]), verifyWriteAuthorization })(request('/v1/admin/shifts' + range));
  assert.deepEqual(await empty.json(), { shifts: [], nextCursor: null });
});

test('schedule list rejects empty dates, invalid ranges, cursor and authorization', async () => {
  const handle = createAdminScheduleList({ db: database([]), verifyWriteAuthorization });
  for (const query of ['', '?from=&to=', range + '&limit=0', range + '&status=unknown', range + '&cursor=invalid', range + '&from=x']) assert.equal((await handle(request('/v1/admin/shifts' + query))).status, 400);
  assert.equal((await handle(request('/v1/admin/shifts' + range, { auth: false }))).status, 401);
});

test('list handlers report unavailable for malformed stored data', async () => {
  const staff = createAdminStaffList({ db: database([{ id: 'bad id', memberships: 1, role: 'VIEWER', active: 1 }]), verifyWriteAuthorization });
  const shifts = createAdminScheduleList({ db: database([{ id: 'bad id' }]), verifyWriteAuthorization });
  assert.equal((await staff(request('/v1/admin/staff'))).status, 503);
  assert.equal((await shifts(request('/v1/admin/shifts' + range))).status, 503);
});

test('admin detail and write handlers validate routes, authentication and payloads', async () => {
  const row = { id: 'shift-a', staffId: 'staff-a', locationId: 'location-a', startsAt: '2026-01-01T09:00:00.000Z', endsAt: '2026-01-01T10:00:00.000Z', graceMinutes: 0, revision: 1, active: 1 };
  const handle = createAdminHandler({ db: database([row]), verifyWriteAuthorization });
  assert.equal((await handle(request('/v1/admin/shifts/shift-a'))).status, 200);
  assert.equal((await handle(request('/v1/admin/shifts/shift-a', { auth: false }))).status, 401);
  assert.equal((await handle(request('/v1/admin/shifts/'))).status, 404);
  assert.equal((await handle(request('/v1/admin/viewers', { method: 'POST' }))).status, 415);
  assert.equal((await handle(request('/v1/admin/viewers', { method: 'POST', contentType: 'application/json', body: '' }))).status, 400);
  assert.equal((await handle(request('/v1/admin/viewers', { method: 'POST', contentType: 'application/json', body: '{' }))).status, 400);
  assert.equal((await createAdminHandler({ db: database([]), verifyWriteAuthorization })(request('/v1/admin/shifts/missing'))).status, 404);
});

test('loopback server and initialization reject invalid setup without listening', () => {
  assert.throws(() => createLoopbackServer());
  assert.throws(() => createLoopbackServer(() => {}, { allowWrites: 'true' }));
  assert.throws(() => initializeNewDatabase(undefined, undefined));
  assert.throws(() => initializeNewDatabase('relative.sqlite', {}));
  const server = createLoopbackServer(() => new Response('example'));
  assert.equal(server.listening, false);
});
