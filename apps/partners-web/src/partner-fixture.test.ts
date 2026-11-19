import assert from 'node:assert/strict';
import test from 'node:test';
import { getDjFixture, getPartnerFixture } from './partner-fixture.ts';
import { bedroomFixture } from './bedroom-fixture.ts';
import { filterLedger } from './ledger-filter.ts';
import { eventOnDay, monthEvents } from './partner-schedule.ts';

test('fixture requires explicit development opt-in and connects calendar to rental ledger', () => {
  for (const [env, enabled] of [['production','1'], ['development',undefined]]) {
    const result = getPartnerFixture(env, enabled, '2026-11-18');
    assert.deepEqual(result.schedule, { kind: 'ready', events: [] });
    assert.deepEqual(result.ledger, { kind: 'ready', rows: [] });
  }
  const result = getPartnerFixture('development', '1', '2026-11-18');
  assert.equal(result.schedule.kind, 'ready'); assert.equal(result.ledger.kind, 'ready');
  if (result.schedule.kind !== 'ready' || result.ledger.kind !== 'ready') throw new Error('unexpected state');
  assert.equal(eventOnDay(result.schedule.events[0], '2026-11-18'), true);
  assert.equal(monthEvents(result.schedule.events, '2026-11', 'rental').length, 1);
  assert.equal(monthEvents(result.schedule.events, '2026-11', 'dj').length, 1);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '대관', status: 'COMPLETED' }).length, 1);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '', status: 'PENDING' }).length, 1);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '02', status: 'PENDING' })[0].counterparty, '대관처 02');
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '02', status: 'COMPLETED' }).length, 0);
});

test('DJ payments are synthetic and require development opt-in and a valid day', () => {
  for (const [env, enabled, day] of [['production','1','2026-11-18'], ['development',undefined,'2026-11-18'], ['development','1','2026-02-30'], ['development','1','invalid']] as const) assert.deepEqual(getDjFixture(env, enabled, day), { kind: 'ready', rows: [] });
  const result = getDjFixture('development', '1', '2026-11-18');
  assert.equal(result.kind, 'ready');
  if (result.kind !== 'ready') throw new Error('unexpected state');
  assert.equal(filterLedger(result.rows, { from: '', to: '', query: 'DJ', status: 'COMPLETED' }).length, 1);
  assert.equal(filterLedger(result.rows, { from: '', to: '', query: '02', status: 'PENDING' })[0].completedAt, null);
});

test('bedroom partner and settlement exist only in the opted-in development fixture', () => {
  for (const [env, enabled, day] of [['production','1','2026-11-18'], ['development',undefined,'2026-11-18'], ['development','1','2026-02-30']] as const) assert.equal(bedroomFixture(env, enabled, day), null);
  const fixture = bedroomFixture('development', '1', '2026-11-18');
  assert.ok(fixture);
  assert.equal(fixture.partner.id, 'partner-01');
  assert.equal(fixture.ledger.kind, 'ready');
  if (fixture.ledger.kind === 'ready') {
    assert.equal(fixture.ledger.rows[0].counterparty, fixture.partner.name);
    assert.equal(fixture.ledger.rows[0].status, 'PENDING');
    assert.equal(fixture.ledger.rows[0].completedAt, null);
  }
});
