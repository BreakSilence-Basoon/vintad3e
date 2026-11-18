import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuditFixtures } from './audit-fixture.ts';

test('audit records exist only as explicitly enabled development fixtures', () => {
  const now = new Date('2026-11-18T00:00:00.000Z');
  assert.deepEqual(getAuditFixtures('production', '1', now), []);
  assert.deepEqual(getAuditFixtures('development', undefined, now), []);
  assert.deepEqual(getAuditFixtures('development', '1', new Date('invalid')), []);
  const rows = getAuditFixtures('development', '1', now);
  assert.equal(rows.length, 21);
  assert.equal(rows[0].operation, 'admin.app-grant.set');
  assert.equal(rows[1].when, '2026-11-17T00:00:00.000Z');
  assert.equal(new Set(rows.map(row => row.id)).size, 21);
  assert.equal(rows.filter(row => row.actor === '직원 02').length, 19);
});
