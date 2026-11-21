import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixtureNotionDocument, fixtureNotionExample } from './fixture-notion-example.mjs';

test('Notion confirmation uses one fixed synthetic document and matching hashes', () => {
  const example = fixtureNotionExample, digest = value => createHash('sha256').update(value).digest('hex');
  assert.equal(example.operation, 'library.notion.import');
  assert.equal(example.target, 'notion-import');
  assert.equal(example.change.title, fixtureNotionDocument.title);
  assert.equal(example.change.batchId, '00000000-0000-4000-8000-000000000109');
  assert.equal(example.change.sourceSha256, digest(fixtureNotionDocument.body));
  assert.equal(example.change.envelopeSha256, digest(JSON.stringify({ title: fixtureNotionDocument.title, body: fixtureNotionDocument.body })));
});
