import test from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from './bedroom-fixture-reading.mjs';

test('reading time uses the source text and image rates for each language', () => {
  assert.equal(readingMinutes('en', Array(265).fill('word').join(' '), 6), 2);
  assert.equal(readingMinutes('ko', '가'.repeat(500), 6), 2);
  assert.equal(readingMinutes('ja', '', 0), 1);
  assert.equal(readingMinutes('ko', '글', 11), 2);
});
