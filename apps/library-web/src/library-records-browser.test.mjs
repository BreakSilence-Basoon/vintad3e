import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

test('original record entry and empty views do not create meetings or upload files', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-library-records-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' }, stdio: 'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, `--remote-debugging-port=${debuggerPort}`, 'about:blank'], { stdio: 'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(origin)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate', { url: origin });
    await waitFor(async () => evaluate("Boolean(document.querySelector('nav[aria-label=자료] a[href=\"/meetings\"]') && document.querySelector('nav[aria-label=자료] a[href=\"/objects\"]'))"));
    await evaluate("document.querySelector('nav[aria-label=자료] a[href=\"/meetings\"]').click()");
    await waitFor(async () => evaluate("location.pathname === '/meetings' && Boolean(document.querySelector('section[data-hydrated=true] #meeting-title'))"));
    assert.ok(await evaluate("document.querySelector('.library-empty').textContent.includes('회의 기록이 없습니다.')"));
    assert.equal(await evaluate("document.querySelector('section[data-hydrated=true] button').disabled"), true);
    await evaluate("window.recordWrites=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const p=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(p.startsWith('/api/meetings')||p.startsWith('/api/objects')){window.recordWrites++;return Promise.reject(new Error('unexpected request'))}return window.originalFetch(input,init)}");
    await evaluate("(()=>{const x=document.querySelector('#meeting-title');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'회의');x.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelector('section[data-hydrated=true] button')?.disabled === false"));
    await evaluate("document.querySelector('section[data-hydrated=true] button').click()");
    await waitFor(async () => evaluate("document.querySelector('[role=alert]')?.textContent === '처리하지 못했습니다. 다시 시도해 주세요.'"));
    assert.equal(await evaluate('window.recordWrites'), 0);
    assert.equal((await fetch(`${origin}/meetings/unknown`)).status, 404);
    await send('Page.navigate', { url: `${origin}/meetings/00000000-0000-4000-8000-000000000004` });
    await waitFor(async () => evaluate("document.querySelector('h1')?.textContent === '업무 회의' && document.querySelectorAll('.library-register[data-hydrated=true]').length === 2"));
    assert.deepEqual(await evaluate("[...document.querySelectorAll('h2')].map(x=>x.textContent)"), ['녹화·녹음 첨부', '회의 문서 등록']);
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의에 첨부').disabled"), true);
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의 문서 확인').disabled"), true);
    await evaluate("(()=>{const x=document.querySelector('select');x.value='CORRECTED';x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("[...document.querySelectorAll('label')].some(x=>x.textContent.includes('근거 문서'))"));
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의 문서 확인').disabled"), true);
    await send('Page.navigate', { url: `${origin}/objects` });
    await waitFor(async () => evaluate("location.pathname === '/objects' && Boolean(document.querySelector('a[href=\"/objects/new\"]'))"));
    assert.ok(await evaluate("document.querySelector('.library-empty').textContent.includes('파일이 없습니다.')"));
    await evaluate("document.querySelector('a[href=\"/objects/new\"]').click()");
    await waitFor(async () => evaluate("location.pathname === '/objects/new' && Boolean(document.querySelector('.library-register[data-hydrated=true]'))"));
    await evaluate("window.recordWrites=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const p=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(p.startsWith('/api/objects')){window.recordWrites++;return Promise.reject(new Error('unexpected request'))}return window.originalFetch(input,init)}");
    assert.equal(await evaluate("document.querySelector('.library-register button').disabled"), true);
    await evaluate("(()=>{const x=document.querySelector('#library-object-file'), files=new DataTransfer();files.items.add(new File(['자료'],'document.txt',{type:'text/plain'}));x.files=files.files;x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelector('.library-register button')?.disabled === false"));
    await evaluate("document.querySelector('.library-register button').click()");
    await waitFor(async () => evaluate("document.querySelector('[role=alert]')?.textContent === '처리하지 못했습니다. 다시 시도해 주세요.'"));
    assert.equal(await evaluate('window.recordWrites'), 0);
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome, server]) process.kill('SIGTERM');
    await Promise.all([chrome, server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process, 'exit'), delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});
