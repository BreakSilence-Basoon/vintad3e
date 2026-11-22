import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import typescript from 'typescript';
import * as objects from './fixture-object.ts';
import * as uploads from './fixture-upload.mjs';
import * as isolated from './fixture-ir-confirmation.mjs';

// Evaluate the real route in memory; this does not start a server or middleware.
function loadRoute(objectModule = objects) {
  const source = readFileSync(new URL('./app/api/objects/[objectId]/source/route.ts', import.meta.url), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText;
  const modules = { '../../../../../fixture-object': objectModule, '../../../../../fixture-upload.mjs': uploads, '../../../../../fixture-ir-confirmation.mjs': isolated };
  const output = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => { if (!(name in modules)) throw new Error('Unexpected import'); return modules[name]; }, output, output.exports);
  return output.exports.GET;
}

test('object source reports missing synthetic files as not_found and preserves successful reads', async () => {
  const oldNodeEnv = process.env.NODE_ENV, oldFixture = process.env.VINTAD3E_LIBRARY_FIXTURE;
  try {
    process.env.NODE_ENV = 'development'; process.env.VINTAD3E_LIBRARY_FIXTURE = '1';
    const get = loadRoute(), request = new Request('http://127.0.0.1:3829/source');
    const missing = await get(request, { params: Promise.resolve({ objectId: '00000000-0000-4000-8000-000000000099' }) });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'not_found' });
    assert.equal(missing.headers.get('cache-control'), 'private, no-store, max-age=0');
    const found = await get(request, { params: Promise.resolve({ objectId: objects.OBJECT_ID }) });
    assert.equal(found.status, 200);
    assert.equal(await found.text(), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
    process.env.VINTAD3E_LIBRARY_FIXTURE = '';
    const hidden = await get(request, { params: Promise.resolve({ objectId: objects.OBJECT_ID }) });
    assert.equal(hidden.status, 404);
    assert.deepEqual(await hidden.json(), { error: 'not_found' });
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFixture === undefined) delete process.env.VINTAD3E_LIBRARY_FIXTURE; else process.env.VINTAD3E_LIBRARY_FIXTURE = oldFixture;
  }
});

test('object source does not misclassify a storage exception as not_found', async () => {
  const get = loadRoute({ getFixtureObject() { throw new Error('synthetic storage error'); } });
  await assert.rejects(get(new Request('http://127.0.0.1:3829/source'), { params: Promise.resolve({ objectId: 'example' }) }), /synthetic storage error/);
});
