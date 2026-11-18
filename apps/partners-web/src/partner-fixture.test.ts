import assert from 'node:assert/strict';
import test from 'node:test';
import { getPartnerFixture } from './partner-fixture.ts';
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
  assert.equal(monthEvents(result.schedule.events, '2026-11', 'dj').length, 0);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '대관', status: 'COMPLETED' }).length, 1);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '', status: 'PENDING' }).length, 1);
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '02', status: 'PENDING' })[0].counterparty, '대관처 02');
  assert.equal(filterLedger(result.ledger.rows, { from: '', to: '', query: '02', status: 'COMPLETED' }).length, 0);
});
