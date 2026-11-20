import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKstDateTime, getCreativeFixtures, projectStatusLabel } from './creative-fixture.ts';

test('creative projects require explicit development opt-in', () => {
  assert.deepEqual(getCreativeFixtures('production', '1'), []);
  assert.deepEqual(getCreativeFixtures('development', undefined), []);
  const projects = getCreativeFixtures('development', '1');
  assert.equal(projects.length, 2);
  assert.deepEqual(getCreativeFixtures('development', '1', 'empty'), []);
  assert.equal(getCreativeFixtures('production', '1', 'empty').length, 0);
  assert.equal(projectStatusLabel[projects[0].status], '제작 중');
});
test('date formatting uses Seoul time and handles invalid values', () => {
  assert.match(formatKstDateTime('2026-01-02T00:00:00.000Z') ?? '', /09:00/);
  assert.equal(formatKstDateTime('invalid'), null);
});
