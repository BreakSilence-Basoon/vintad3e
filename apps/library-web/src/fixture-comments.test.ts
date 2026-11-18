import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFixtureComments } from './fixture-comments.ts';

const valid = { id: '00000000-0000-4000-8000-000000000001', body: '안내', createdAt: '2026-11-18T00:00:00.000Z' };
test('only valid comments are read and duplicate IDs are removed', () => {
  assert.deepEqual(parseFixtureComments(JSON.stringify([valid, valid, { ...valid, id: 'invalid' }, { ...valid, createdAt: 'invalid' }, { ...valid, body: '' }])), [valid]);
  assert.deepEqual(parseFixtureComments('{'), []);
  assert.deepEqual(parseFixtureComments('{}'), []);
  assert.deepEqual(parseFixtureComments('x'.repeat(3_000_001)), []);
});
test('one extra valid comment is retained to indicate there are more than 200', () => {
  const comments = Array.from({ length: 202 }, (_, index) => ({ ...valid, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }));
  assert.deepEqual(parseFixtureComments(JSON.stringify(comments)), comments.slice(0, 201));
});
