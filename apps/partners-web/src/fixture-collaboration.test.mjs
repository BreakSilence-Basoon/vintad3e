import test from 'node:test'; import assert from 'node:assert/strict'; import { periodRows, readCollaboration } from './fixture-collaboration.mjs';
test('date ranges select synthetic collaboration sales or reject invalid input', () => { assert.equal(periodRows(undefined,undefined).length,2); assert.equal(periodRows('2026-01-03','2026-01-03').length,1); assert.equal(periodRows('2027-01-01','').length,0); assert.equal(periodRows('2026-02-30',''),null); assert.equal(periodRows('2026-03-01','2026-01-01'),null); assert.equal(periodRows(['2026-01-01'],'') ,null); });
test('synthetic read error is explicit and invalid dates take precedence', () => {
  const fixture = { NODE_ENV: 'development', VINTAD3E_PARTNERS_FIXTURE: '1', VINTAD3E_PARTNERS_COLLABORATION_STATE: 'error' };
  assert.equal(readCollaboration('', '', fixture).kind, 'error');
  assert.equal(readCollaboration('2026-02-30', '', fixture).kind, 'invalid');
  assert.equal(readCollaboration('', '', { ...fixture, NODE_ENV: 'production' }).kind, 'ready');
  assert.equal(readCollaboration('', '', { ...fixture, VINTAD3E_PARTNERS_FIXTURE: '0' }).kind, 'ready');
});
