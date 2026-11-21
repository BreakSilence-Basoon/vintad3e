import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

test('product loading renders the original accessible skeleton without visible placeholder text', () => {
  const source = readFileSync(new URL('./admin-data-fallback.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(module.exports, createRequire(import.meta.url), module);
  const html = renderToStaticMarkup(module.exports.AdminDataFallback({}));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="데이터 로딩"/);
  assert.match(html, /aria-hidden="true"/);
  assert.equal((html.match(/class="skeleton-row"/g) ?? []).length, 4);
  assert.equal(html.replace(/<[^>]*>/g, ''), '');
});
