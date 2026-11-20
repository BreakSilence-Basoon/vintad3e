import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const filename = fileURLToPath(new URL('./fixture-corrected-renderer.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const loaded = new Module(filename); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(dirname(filename)); loaded._compile(compiled, filename);
const { MeetingCorrectedRenderer } = loaded.exports;
const strong = value => ({ tag: 'strong', children: [value] }), cell = value => ({ tag: 'td', children: [value] });
const render = nodes => renderToStaticMarkup(React.createElement(MeetingCorrectedRenderer, { nodes }));

test('corrected transcript splits synthetic speakers and connects unique notes in both directions', () => {
  const nodes = [{ tag: 'p', children: [strong('직원'), ' 첫 발언 [¹] ', strong('담당자'), ' 답변 [¹]'] }, { tag: 'table', children: [{ tag: 'tbody', children: [{ tag: 'tr', children: [cell('¹'), cell('교정 근거')] }] }] }];
  const html = render(nodes);
  assert.equal((html.match(/class="library-transcript__speaker"/g) ?? []).length, 2);
  assert.ok(html.includes('href="#meeting-note-¹"') && html.includes('id="meeting-note-¹"'));
  assert.ok(html.includes('href="#meeting-reference-1"') && html.includes('href="#meeting-reference-2"'));
});

test('ambiguous notes stay text and untrusted content is escaped', () => {
  const row = () => ({ tag: 'tr', children: [cell('¹'), cell('근거')] });
  const html = render([{ tag: 'p', children: ['<script>bad</script> [¹] [²]'] }, { tag: 'table', children: [{ tag: 'tbody', children: [row(), row()] }] }]);
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;') && html.includes('[¹] [²]'));
  assert.equal(html.includes('href="#meeting-note-¹"'), false);
});

test('timestamps are hidden in transcript text but remain in correction evidence', () => {
  const nodes = [{ tag: 'p', children: ['[00:12:34] 발언'] }, { tag: 'table', children: [{ tag: 'tbody', children: [{ tag: 'tr', children: [cell('[00:12:34] 근거')] }] }] }];
  const html = render(nodes);
  assert.equal((html.match(/\[00:12:34\]/g) ?? []).length, 1);
  assert.equal(nodes[0].children[0], '[00:12:34] 발언');
});
