import test from 'node:test';
import assert from 'node:assert/strict';
import { isSearchResultHref } from './search-result-href.ts';
import { searchFixture } from './library-search-fixture.ts';

test('accepts supported internal search destinations and existing synthetic results', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const path of [`/meetings/${id}`, `/ir/${id}`, `/publications/${id}`, `/objects/${id}`, `/objects/${id}?documentId=${id}`, `/objects/${id}?documentId=${id}&view=corrected`]) assert.equal(isSearchResultHref(path), true, path);
  const data = searchFixture('development', '1', '', 'all', '', Date.now());
  assert.ok(data?.results.length);
  assert.ok(data.results.some(item => item.href === '/ir/00000000-0000-4000-8000-000000000001'));
  for (const item of data.results) assert.equal(isSearchResultHref(item.href), true, item.href);
});

test('rejects external, escaped and unsupported search destinations', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const path of [`//example.invalid/objects/${id}`, `https://example.invalid/objects/${id}`, `/objects/${id}?documentId=${id}&next=https://example.invalid`, `/objects/${id}?documentId=${id}&view=other`, `/objects/${id}?documentId=${id}#x`, '/ir/%2e%2e', `/meetings/${id}/../other`, `/objects/${id}?documentId=${id}&view=corrected&view=corrected`, `/objects/${id}?view=corrected`, `/ir/${id}\\escape`]) assert.equal(isSearchResultHref(path), false, path);
});
