import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOwnAccessHandler } from '../src/index.mjs';

const url = 'https://app.example.invalid/v1/me/access';
const identity = { issuer: 'https://identity.example.invalid', subject: 'example-user', issuedAt: 123 };

test('returns only the current verified role', async () => {
  const handler = createOwnAccessHandler({ verifyAuthorization: async () => identity, findOwnAccess: async (...args) => {
    assert.deepEqual(args, [identity.issuer, identity.subject, identity.issuedAt]);
    return 'VIEWER';
  } });
  const response = await handler(new Request(url));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { role: 'VIEWER' });
  assert.equal((await handler(new Request(`${url}?subject=other`))).status, 400);
  assert.equal((await handler(new Request(url, { method: 'POST' }))).status, 404);
});

test('unauthenticated, inactive, invalid and failing lookups fail closed', async () => {
  const make = (verifyAuthorization, findOwnAccess) => createOwnAccessHandler({ verifyAuthorization, findOwnAccess });
  assert.equal((await make(async () => null, async () => 'ADMIN')(new Request(url))).status, 401);
  assert.equal((await make(async () => identity, async () => null)(new Request(url))).status, 404);
  assert.equal((await make(async () => identity, async () => 'OWNER')(new Request(url))).status, 503);
  assert.equal((await make(async () => identity, async () => { throw new Error('private'); })(new Request(url))).status, 503);
});
