import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicationHtml } from './fixture-publication-content.ts';

test('corrected HTML keeps safe transcript and table while removing scripts', () => {
  const nodes = parsePublicationHtml('<p><strong>직원</strong> 인사 [¹]</p><script>alert(1)</script><table><tbody><tr><td>¹</td><td>교정 근거</td></tr></tbody></table>', 'fixture', []);
  const text = JSON.stringify(nodes);
  assert.ok(text.includes('직원') && text.includes('교정 근거'));
  assert.equal(text.includes('script'), false);
  assert.equal(text.includes('alert(1)'), false);
});
