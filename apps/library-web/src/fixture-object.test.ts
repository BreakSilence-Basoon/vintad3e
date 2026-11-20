import assert from 'node:assert/strict';
import test from 'node:test';
import { getFixtureObject, OBJECT_ID } from './fixture-object.ts';

test('only the known development fixture can be read', () => {
  assert.equal(getFixtureObject('production', '1', OBJECT_ID), null);
  assert.equal(getFixtureObject('development', undefined, OBJECT_ID), null);
  assert.equal(getFixtureObject('development', '1', 'unknown'), null);
  assert.equal(getFixtureObject('development', '1', OBJECT_ID)?.filename, '업무 안내.txt');
});
