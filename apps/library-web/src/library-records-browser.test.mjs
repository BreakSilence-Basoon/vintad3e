import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}

test('activity pages show original read errors on desktop and mobile', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin, VINTAD3E_LIBRARY_ACTIVITY_STATE: 'error' }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/bookmarks`);
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL('**/bookmarks');
        for (const [path, message] of [['/bookmarks', '보관함을 불러오지 못했습니다.'], ['/mypage', '내 활동을 불러오지 못했습니다.'], ['/members', '구성원을 불러오지 못했습니다.']]) {
          if (path !== '/bookmarks') await page.goto(origin + path);
          await page.getByRole('alert').getByText(message, { exact: true }).waitFor();
        }
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

test('synthetic meeting stays in the tab and arbitrary file upload remains disconnected', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-library-records-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
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
    await waitFor(async () => evaluate("location.pathname === '/sign-in' && Boolean(document.querySelector('form button'))"));
    await evaluate("document.querySelector('form button').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('nav[aria-label=자료] a[href=\"/meetings\"]') && document.querySelector('nav[aria-label=자료] a[href=\"/objects\"]'))"));
    await evaluate("document.querySelector('nav[aria-label=자료] a[href=\"/meetings\"]').click()");
    await waitFor(async () => evaluate("location.pathname === '/meetings' && Boolean(document.querySelector('section[data-hydrated=true] #meeting-title'))"));
    assert.equal(await evaluate("document.querySelector('a[href=\"/meetings/00000000-0000-4000-8000-000000000004\"]')?.textContent"), '업무 회의');
    assert.equal(await evaluate("document.querySelector('section[data-hydrated=true] button').disabled"), true);
    await evaluate("window.recordWrites=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const p=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(p.startsWith('/api/meetings')||p.startsWith('/api/objects')){window.recordWrites++;return Promise.reject(new Error('unexpected request'))}return window.originalFetch(input,init)}");
    await evaluate("(()=>{const x=document.querySelector('#meeting-title');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'회의');x.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelector('section[data-hydrated=true] button')?.disabled === false"));
    await evaluate("document.querySelector('section[data-hydrated=true] button').click()");
    await waitFor(async () => evaluate("location.pathname.startsWith('/meetings/') && document.querySelector('h1')?.textContent === '회의'"));
    assert.equal(await evaluate('window.recordWrites'), 0);
    await evaluate('window.__meetingBeforeReload = true'); await send('Page.reload');
    await waitFor(async () => evaluate("window.__meetingBeforeReload !== true && document.querySelector('h1')?.textContent === '회의'"));
    await send('Page.navigate', { url: `${origin}/meetings` });
    await waitFor(async () => evaluate("[...document.querySelectorAll('a')].some(a=>a.textContent==='회의')"));
    assert.equal((await fetch(`${origin}/meetings/unknown`)).status, 404);
    await evaluate("document.querySelector('a[href=\"/meetings/00000000-0000-4000-8000-000000000004\"]').click()");
    await waitFor(async () => evaluate("document.querySelector('h1')?.textContent === '업무 회의' && document.querySelectorAll('.library-register[data-hydrated=true]').length === 2"));
    assert.deepEqual(await evaluate("[...document.querySelectorAll('article.library-page h2')].map(x=>x.textContent)"), ['녹화·녹음 첨부', '회의 문서 등록']);
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의에 첨부').disabled"), true);
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의 문서 확인').disabled"), true);
    await evaluate("(()=>{const x=document.querySelector('article.library-page select');x.value='CORRECTED';x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("[...document.querySelectorAll('label')].some(x=>x.textContent.includes('근거 문서'))"));
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='회의 문서 확인').disabled"), true);
    await send('Page.navigate', { url: `${origin}/objects` });
    await waitFor(async () => evaluate("location.pathname === '/objects' && Boolean(document.querySelector('a[href=\"/objects/new\"]'))"));
    assert.equal(await evaluate("document.querySelector('.library-attachment-card__name')?.textContent"), '업무 안내.txt');
    await evaluate("fetch('/api/fixture/login',{method:'POST'}).then(response=>{if(!response.ok)throw Error('login failed')})");
    await evaluate("document.querySelector('a[href=\"/objects/new\"]').click()");
    await waitFor(async () => evaluate("location.pathname === '/objects/new' && Boolean(document.querySelector('.library-register[data-hydrated=true]'))"));
    await evaluate("window.recordWrites=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const p=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(p.startsWith('/api/objects')){window.recordWrites++;return Promise.reject(new Error('unexpected request'))}return window.originalFetch(input,init)}");
    assert.equal(await evaluate("document.querySelector('.library-register button').disabled"), true);
    await evaluate("(()=>{const x=document.querySelector('#library-object-file'), files=new DataTransfer();files.items.add(new File(['자료'],'document.txt',{type:'text/plain'}));x.files=files.files;x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelector('.library-register button')?.disabled === false"));
    await evaluate("document.querySelector('.library-register button').click()");
    await waitFor(async () => evaluate("document.querySelector('[role=alert]')?.textContent === '처리하지 못했습니다. 다시 시도해 주세요.'"));
    assert.equal(await evaluate('window.recordWrites'), 0);
    await evaluate("(()=>{const x=document.querySelector('#library-object-file'), files=new DataTransfer();files.items.add(new File(['업무를 시작하기 전에 필요한 사항을 확인합니다.'],'가게 안내.txt',{type:'text/plain'}));x.files=files.files;x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    for (const [label, next] of [['업로드 내용 확인','제안 불러오기'], ['제안 불러오기','제안 검토'], ['제안 검토','이 변경 확인'], ['이 변경 확인','업로드 승인'], ['업로드 승인','파일 올리기']]) {
      await evaluate(`Array.from(document.querySelectorAll('button')).find(item=>item.textContent===${JSON.stringify(label)}).click()`);
      await waitFor(async () => evaluate(`Array.from(document.querySelectorAll('button')).some(item=>item.textContent===${JSON.stringify(next)})`));
    }
    await evaluate("Array.from(document.querySelectorAll('button')).find(item=>item.textContent==='파일 올리기').click()");
    await waitFor(async () => evaluate("document.querySelector('a[href=\"/objects/00000000-0000-4000-8000-000000000009\"]')?.textContent === '파일 열기'"));
    await evaluate("document.querySelector('a[href=\"/objects/00000000-0000-4000-8000-000000000009\"]').click()");
    await waitFor(async () => evaluate("location.pathname === '/objects/00000000-0000-4000-8000-000000000009' && document.querySelector('h1')?.textContent === '가게 안내.txt'"));
    for (const [kind, id, title, expected] of [
      ['objects', '00000000-0000-4000-8000-000000000005', '파일', '업무를 시작하기 전에 필요한 사항을 확인합니다.'],
      ['documents', '00000000-0000-4000-8000-000000000006', '문서', '함께 일하는 사람에게 필요한 내용을 전달합니다.'],
    ]) {
      await send('Page.navigate', { url: `${origin}/public/${kind}/${id}` });
      await waitFor(async () => evaluate(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`));
      await waitFor(async () => evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(x=>x.textContent==='파일 열기');button?.click();return Boolean(document.querySelector('pre.publication-content'));})()"));
      assert.equal(await evaluate("document.querySelector('pre.publication-content').textContent"), expected);
      const link = await evaluate("[...document.querySelectorAll('a')].find(x=>x.textContent==='원본 열기').getAttribute('href')");
      assert.equal(link, `/api/public/${kind}/${id}/source`);
      const response = await fetch(`${origin}${link}`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(await response.text(), expected);
    }
    assert.equal((await fetch(`${origin}/api/public/objects/unknown/source`)).status, 404);
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome, server]) process.kill('SIGTERM');
    await Promise.all([chrome, server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process, 'exit'), delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});
