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

test('bookmarks show the original empty state with fixtures disabled', { timeout: 60000 }, async () => {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_LIBRARY_FIXTURE:''}, stdio:'ignore' });
  try {
    const response = await waitFor(async () => { const result = await fetch(`${origin}/bookmarks`); return result.status === 200 ? result : false; });
    assert.match(await response.text(), /저장한 게시물이 없습니다\./);
    assert.match(await (await fetch(`${origin}/meetings`)).text(), /회의 기록이 없습니다\./);
    assert.equal((await fetch(`${origin}/publications/00000000-0000-4000-8000-000000000001`)).status, 404);
    assert.equal((await fetch(`${origin}/documents/legacy-document`)).status, 404);
    assert.equal((await fetch(`${origin}/api/publications/00000000-0000-4000-8000-000000000001/source`)).status, 404);
    assert.equal((await fetch(`${origin}/objects/00000000-0000-4000-8000-000000000003`)).status, 404);
    assert.match(await (await fetch(`${origin}/objects`)).text(), /파일이 없습니다\./);
    assert.equal((await fetch(`${origin}/api/objects/00000000-0000-4000-8000-000000000003/source`)).status, 404);
    const legacy = await fetch(`${origin}/publications?q=${encodeURIComponent('매장 & 운영')}`, { redirect: 'manual' });
    assert.equal(legacy.status, 307);
    const destination = new URL(legacy.headers.get('location'), origin);
    assert.equal(destination.pathname, '/');
    assert.equal(destination.searchParams.get('q'), '매장 & 운영');
    const oversized = await fetch(`${origin}/publications?q=${'a'.repeat(201)}`, { redirect: 'manual' });
    assert.equal(new URL(oversized.headers.get('location'), origin).searchParams.get('q').length, 200);
    const duplicate = await fetch(`${origin}/publications?q=one&q=two`, { redirect: 'manual' });
    assert.equal(new URL(duplicate.headers.get('location'), origin).search, '');
    for (const path of ['/publish', '/publications/new']) {
      const oldPublish = await fetch(`${origin}${path}`, { redirect: 'manual' });
      assert.equal(oldPublish.status, 307);
      assert.equal(new URL(oldPublish.headers.get('location'), origin).pathname, '/');
    }
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server,'exit'),delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

test('fixture search, document and community in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-library-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_LIBRARY_FIXTURE:'1',VINTAD3E_LIBRARY_FIXTURE_ORIGIN:origin}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(origin)).ok);
    assert.equal((await fetch(`${origin}/documents/legacy-document`)).status, 404);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    const run = async expression => { await evaluate(expression); await delay(150); };
    await send('Page.navigate',{url:origin});
    await waitFor(async () => evaluate("document.querySelectorAll('.library-feed li').length === 5"));
    assert.equal(await evaluate("document.querySelectorAll('.library-post').length"), 5);
    assert.ok(await evaluate("Boolean(document.querySelector('.library-feed a[href=\"/objects/00000000-0000-4000-8000-000000000003\"]'))"));
    await send('Page.navigate',{url:`${origin}/?q=${encodeURIComponent('운영')}`});
    await waitFor(async () => evaluate("location.search.includes('q=') && document.querySelectorAll('.library-feed li').length === 1"));
    assert.ok(await evaluate("document.querySelector('.library-feed').textContent.includes('매장 운영 안내')"));
    await evaluate("document.querySelector('.library-feed a').click()");
    await waitFor(async () => evaluate("location.pathname === '/sign-in' && Boolean(document.querySelector('form button'))"));
    await evaluate("document.querySelector('form button').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.publication-content'))"));
    assert.equal(await evaluate("location.pathname"), '/publications/00000000-0000-4000-8000-000000000001');
    assert.ok(await evaluate("document.querySelector('.publication-content').textContent.includes('업무를 시작하기')"));
    await waitFor(async () => evaluate("Boolean(document.querySelector('.library-source__trigger'))"));
    assert.equal(await evaluate("document.querySelector('.library-source__trigger').getAttribute('aria-expanded')"), 'false');
    await run("document.querySelector('.library-source__trigger').click()");
    await waitFor(async () => evaluate("document.querySelector('.library-source__trigger').getAttribute('aria-expanded') === 'true'"));
    assert.ok(await evaluate("document.querySelector('.library-source__body').textContent.includes('Markdown')"));
    await run("document.querySelector('.library-source__trigger').click()");
    await waitFor(async () => evaluate("document.querySelector('.library-source__trigger').getAttribute('aria-expanded') === 'false'"));
    const sourcePath = await evaluate("document.querySelector('.publication-actions a').getAttribute('href')");
    assert.equal(sourcePath, '/api/publications/00000000-0000-4000-8000-000000000001/source');
    const download = await fetch(`${origin}${sourcePath}`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /^attachment;/);
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await download.text(), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
    assert.equal((await fetch(`${origin}/api/publications/unknown/source`)).status, 404);
    const objectPath = '/objects/00000000-0000-4000-8000-000000000003';
    assert.equal((await fetch(`${origin}${objectPath}?documentId=00000000-0000-4000-8000-000000000001`)).status, 404);
    assert.equal((await fetch(`${origin}/api/objects/unknown/source`)).status, 404);
    await send('Page.navigate',{url:`${origin}/objects`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.library-attachment-card'))"));
    assert.equal(await evaluate("document.querySelector('.library-attachment-card__meta').textContent"), 'TXT · 1 KB');
    await evaluate("document.querySelector('.library-attachment-card').click()");
    await waitFor(async () => evaluate("document.querySelector('h1')?.textContent === '업무 안내.txt'"));
    await waitFor(async () => evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(x=>x.textContent==='파일 열기');button?.click();return Boolean(document.querySelector('pre.publication-content'));})()"));
    assert.equal(await evaluate("document.querySelector('pre.publication-content').textContent"), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
    const objectSource = await evaluate("document.querySelector('a[download]').getAttribute('href')");
    assert.equal(objectSource, '/api/objects/00000000-0000-4000-8000-000000000003/source');
    const objectDownload = await fetch(`${origin}${objectSource}`);
    assert.equal(objectDownload.headers.get('x-content-type-options'), 'nosniff');
    assert.match(objectDownload.headers.get('content-disposition'), /^attachment;/);
    assert.equal(await objectDownload.text(), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
    await send('Page.navigate',{url:`${origin}/publications/00000000-0000-4000-8000-000000000001`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.publication-community button'))"));
    await waitFor(async () => evaluate("(()=>{const b=document.querySelector('.publication-community button');if(b?.getAttribute('aria-pressed')==='true')return true;b?.click();return false;})()"));
    assert.equal(await evaluate("document.querySelector('.publication-community button').textContent"),'저장 해제');
    await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}})");
    await run("document.querySelector('.publication-actions button').click()");
    await waitFor(async () => evaluate("window.copied?.includes('업무를 시작하기')"));
    await run("document.querySelectorAll('.publication-actions button')[1].click()");
    await waitFor(async () => evaluate("/^library:00000000-0000-4000-8000-000000000001:1:sha256:[0-9a-f]{64}$/.test(window.copied)"));
    await run("(()=>{const x=document.querySelector('#publication-comment');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(x,'좋은 안내입니다.');x.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await run("document.querySelector('.publication-community form').requestSubmit()");
    await waitFor(async () => evaluate("document.querySelector('.library-comments')?.textContent.includes('좋은 안내입니다.')"));
    await send('Page.reload');
    await waitFor(async () => evaluate("document.querySelector('.library-comments')?.textContent.includes('좋은 안내입니다.')"));
    await send('Page.navigate',{url:`${origin}/publications/00000000-0000-4000-8000-000000000002`});
    await waitFor(async () => evaluate("document.querySelector('.publication-community .library-empty')?.textContent.includes('아직 댓글이 없습니다.')"));
    assert.ok(await evaluate("!document.querySelector('.library-comments')"));
    await send('Page.navigate',{url:`${origin}/mypage`});
    await waitFor(async () => evaluate("document.querySelector('.library-comments')?.textContent.includes('좋은 안내입니다.')"));
    assert.equal(await evaluate("document.querySelectorAll('.library-feed li').length"),2);
    assert.equal(await evaluate("document.querySelector('.library-comments a').getAttribute('href')"), '/publications/00000000-0000-4000-8000-000000000001#comments');
    await evaluate("document.querySelector('.library-comments a').click()");
    await waitFor(async () => evaluate("location.hash === '#comments' && document.querySelector('.publication-community .library-comments')?.textContent.includes('좋은 안내입니다.')"));
    await send('Page.navigate',{url:`${origin}/bookmarks`});
    await waitFor(async () => evaluate("document.querySelector('.library-feed')?.textContent.includes('매장 운영 안내')"));
    assert.equal(await evaluate("document.querySelector('#saved-posts-title')?.textContent"), '저장한 게시물');
    assert.equal(await evaluate("document.querySelectorAll('.library-feed li').length"),1);
    await evaluate("document.querySelector('.library-feed a').click()");
    await waitFor(async () => evaluate("document.querySelector('.publication-community button')?.getAttribute('aria-pressed') === 'true'"));
    await waitFor(async () => evaluate("document.querySelector('.library-comments')?.textContent.includes('좋은 안내입니다.')"));
    await run("document.querySelector('.publication-community button').click()");
    await waitFor(async () => evaluate("document.querySelector('.publication-community button')?.getAttribute('aria-pressed') === 'false'"));
    await send('Page.navigate',{url:`${origin}/bookmarks`});
    await waitFor(async () => evaluate("document.querySelector('.library-empty')?.textContent.includes('저장한 게시물이 없습니다.')"));
    await send('Page.navigate',{url:`${origin}/members`});
    await waitFor(async () => evaluate("document.querySelectorAll('.library-member-list li').length === 2"));
    assert.equal(await evaluate("document.querySelectorAll('.library-member-list li > strong').length"), 2);
    assert.equal(await evaluate("document.querySelector('#library-search').maxLength"), 100);
    await evaluate("document.querySelector('#library-search').value='직원';document.querySelector('.library-search').requestSubmit()");
    await waitFor(async () => evaluate("location.search.includes('q=') && document.querySelectorAll('.library-member-list li').length === 1"));
    assert.equal(await evaluate("document.querySelector('.library-member-list li').textContent"), '직원');
    await evaluate("document.querySelector('#library-search').value='찾을 수 없음';document.querySelector('.library-search').requestSubmit()");
    await waitFor(async () => evaluate("document.querySelector('.library-empty')?.textContent.includes('구성원이 없습니다.')"));
    await evaluate("(()=>{const comments=Array.from({length:200},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,body:'안내',createdAt:'2026-11-18T00:00:00.000Z'}));sessionStorage.setItem('vintad3e-library-fixture-comments:00000000-0000-4000-8000-000000000001',JSON.stringify(comments));})()");
    await send('Page.navigate',{url:`${origin}/publications/00000000-0000-4000-8000-000000000001`});
    await waitFor(async () => evaluate("document.querySelectorAll('.library-comments li').length===200"));
    await run("(()=>{const x=document.querySelector('#publication-comment');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(x,'새 댓글');x.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await run("document.querySelector('.publication-community form').requestSubmit()");
    await waitFor(async () => evaluate("document.querySelector('.publication-community')?.textContent.includes('최근 댓글 200개를 표시합니다.')"));
    assert.equal(await evaluate("document.querySelectorAll('.library-comments li').length"),200);
    assert.ok(await evaluate("document.querySelector('.library-comments li').textContent.includes('새 댓글')"));
    await send('Page.navigate',{url:`${origin}/mypage`});
    await waitFor(async () => evaluate("document.querySelector('#my-comments-title')?.parentElement.textContent.includes('최근 댓글 200개를 표시합니다.')"));
    assert.equal(await evaluate("document.querySelectorAll('.library-comments li').length"),200);
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
