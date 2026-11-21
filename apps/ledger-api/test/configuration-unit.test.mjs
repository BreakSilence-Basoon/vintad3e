import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { exportJWK, generateKeyPair } from 'jose';
import { initializeNewLedgerDatabase } from '../src/init-db.mjs';
import { prepareLedgerService } from '../src/main.mjs';

test('initialization rejects empty, relative and unexpected inputs before creating a database', () => {
  for (const [path, input] of [[undefined, undefined], ['relative.sqlite', {}], ['', null], ['/invalid', []], ['/invalid', { businessId: 'example' }], ['/invalid', { businessId: 'example', grant: {}, extra: true }]]) {
    assert.throws(() => initializeNewLedgerDatabase(path, input));
  }
});

test('service rejects empty configuration and malformed database paths', () => {
  assert.throws(() => prepareLedgerService({}));
  assert.throws(() => prepareLedgerService({ VINTAD3E_LEDGER_DATABASE_FILE: 'relative.sqlite', VINTAD3E_LEDGER_PORT: '3001' }));
});

test('initialization and service configuration validate valid and invalid values without listening', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vintad3e-ledger-unit-'));
  let db, service;
  try {
    const database = join(dir, 'example.sqlite'), keys = join(dir, 'keys.json');
    const issuer = 'https://identity.example.invalid';
    const grant = { issuer, subject: 'example-user', actorId: 'example-actor', active: true, read: true, write: true, tokenValidAfter: 0, operatorId: 'example-operator', reason: 'Example setup' };
    initializeNewLedgerDatabase(database, { businessId: 'example-shop', grant });
    assert.throws(() => initializeNewLedgerDatabase(database, { businessId: 'example-shop', grant }));
    db = new DatabaseSync(database, { readOnly: true });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ledger_authority_grants').get().n, 1);
    db.close(); db = undefined;
    const { publicKey } = await generateKeyPair('RS256');
    writeFileSync(keys, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: 'example', alg: 'RS256', use: 'sig' }] }));
    const config = { VINTAD3E_LEDGER_DATABASE_FILE: database, VINTAD3E_LEDGER_JWKS_FILE: keys, VINTAD3E_LEDGER_PORT: '3001', VINTAD3E_LEDGER_ISSUER: issuer, VINTAD3E_LEDGER_AUDIENCE: 'https://api.example.invalid', VINTAD3E_LEDGER_CLIENT_ID: 'example-client', VINTAD3E_LEDGER_BUSINESS_ID: 'example-shop', VINTAD3E_LEDGER_READ_SCOPE: 'ledger:read', VINTAD3E_LEDGER_WRITE_SCOPE: 'ledger:write' };
    for (const value of ['', '0', '65536', '-1', 'abc']) assert.throws(() => prepareLedgerService({ ...config, VINTAD3E_LEDGER_PORT: value }));
    assert.throws(() => prepareLedgerService({ ...config, VINTAD3E_LEDGER_ENABLE_WRITES: 'yes' }));
    assert.throws(() => prepareLedgerService({ ...config, VINTAD3E_LEDGER_BUSINESS_ID: 'other-shop' }));
    service = prepareLedgerService(config);
    assert.equal(service.port, 3001);
    assert.equal(service.server.listening, false);
  } finally {
    if (db?.isOpen) db.close();
    if (service?.db.isOpen) service.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
