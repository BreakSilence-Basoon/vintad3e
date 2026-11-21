import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixtureIrExample } from './fixture-ir-examples.mjs';

test('internal document examples contain only fixed synthetic single and batch inputs', () => {
  const single = fixtureIrExample('single'), batch = fixtureIrExample('batch');
  assert.equal(single.operation, 'library.ir.import');
  assert.equal(batch.operation, 'library.ir.batch-import');
  assert.equal(batch.change.entries.length, 1);
  assert.equal(single.change.stageId, batch.change.entries[0].stageId);
  assert.match(single.change.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(batch.change.manifestSha256, createHash('sha256').update(JSON.stringify(batch.change.entries)).digest('hex'));
  for (const kind of ['unknown', '__proto__', 'constructor']) assert.equal(fixtureIrExample(kind), null);
});
