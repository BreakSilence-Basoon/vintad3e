import test from 'node:test';
import assert from 'node:assert/strict';
import { fixturePortalLinks } from './fixture-links.mjs';

test('fixture links require explicit development mode and a matching grant', () => {
  const enabled = { nodeEnv: 'development', enabled: '1', grants: ['timetable', 'unknown'] };
  assert.deepEqual(fixturePortalLinks(enabled), { timetable: 'http://127.0.0.1:3824/' });
  for (const input of [{ ...enabled, nodeEnv: 'production' }, { ...enabled, nodeEnv: 'test' }, { ...enabled, enabled: '0' }, { ...enabled, grants: [] }, { ...enabled, grants: null }, { ...enabled, grants: ['constructor', '__proto__'] }]) {
    assert.deepEqual(fixturePortalLinks(input), {});
  }
});
