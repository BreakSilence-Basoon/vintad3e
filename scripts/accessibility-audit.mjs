import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

// Pin and verify the published axe-core archive before evaluating it in a local page.
const archiveUrl = 'https://registry.npmjs.org/axe-core/-/axe-core-4.14.1.tgz';
const integrity = 'FHfa+lmNjQZfJz1q8wKqIDwC6DExcHt/pkjNQb09a3NPjCKg2rhu5qb2S4r76ASyFNNtuFooJpZe37OgudVGtQ==';
async function axeSource() {
  const response = await fetch(archiveUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`axe download HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.length > 4_000_000 || createHash('sha512').update(archive).digest('base64') !== integrity) throw new Error('axe archive integrity mismatch');
  const tar = gunzipSync(archive, { maxOutputLength: 10_000_000 });
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = tar.toString('utf8', offset, offset + 100).replace(/\0.*$/s, '');
    const size = Number.parseInt(tar.toString('ascii', offset + 124, offset + 136).replace(/\0.*$/s, '').trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('invalid axe archive');
    if (name === 'package/axe.min.js') return tar.toString('utf8', offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('axe script missing');
}

const apps = [
  ['portal', ['/', '/about', '/sign-in', '/confirmations/proposal-01']],
  ['timetable', ['/', '/schedule', '/history', '/sign-in', '/access-denied', '/scan']],
  ['apparel', ['/', '/admin/sales', '/admin/stats', '/sign-in', '/access-denied']],
  ['supporters', ['/', '/coupon', '/instagram', '/tiktok', '/settlements', '/sign-in']],
  ['partners', ['/', '/dj', '/rental', '/proj-bedroom', '/guide/dj', '/proj-bedroom/guide/ko', '/sign-in', '/accounts']],
  ['library', ['/', '/meetings', '/objects', '/bookmarks', '/sign-in', '/objects/new']],
  ['floor', ['/', '/sales', '/inventory', '/sign-in', '/access-denied']],
  ['creative', ['/', '/sign-in', '/confirmations/proposal-01']],
  ['admin', ['/members', '/permissions', '/permissions/apps', '/audit', '/sign-in']],
];
const emptyPaths = { portal: '/', timetable: '/', apparel: '/admin/sales', supporters: '/coupon', partners: '/', library: '/bookmarks', floor: '/sales', creative: '/', admin: '/members' };
async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
const requested = process.argv.slice(2);
if (requested.some(name => !apps.some(app => app[0] === name))) throw new Error('Unknown app');
const axe = await axeSource();
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--no-sandbox'] });
let failed = false;
try {
  for (const [name, paths] of apps) for (const mode of ['fixture', 'empty']) {
    if (requested.length && !requested.includes(name)) continue;
    const port = await freePort(), origin = `http://127.0.0.1:${port}`;
    const flag = `VINTAD3E_${name.toUpperCase()}_FIXTURE`;
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: resolve(`apps/${name}-web`), env: { ...process.env, NODE_ENV: 'development', [flag]: mode === 'fixture' ? '1' : '', [`${flag}_ORIGIN`]: origin }, stdio: 'ignore' });
    try {
      let ready = false;
      for (let i = 0; i < 120; i++) { if (child.exitCode !== null) break; try { const response = await fetch(origin, { redirect: 'manual' }); if (response.status < 500) { ready = true; break; } } catch {} await delay(250); }
      if (!ready) throw new Error('server did not start');
      for (const path of mode === 'fixture' ? paths : [emptyPaths[name], '/__missing__']) for (const width of mode === 'fixture' ? [1440, 390] : [390]) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          if (name === 'timetable' && path === '/scan') await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); }; });
          const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForTimeout(300);
          if (path === '/__missing__' ? response?.status() !== 404 : !response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'none'}`);
          // Next's development-only inspector is outside the application under test.
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          if (mode === 'fixture' && (name === 'portal' && path === '/' || page.url().includes('/sign-in?next='))) {
            await page.getByRole('button', { name: '회사 계정으로 로그인' }).focus();
            await Promise.all([page.waitForResponse(response => response.url().includes('/api/fixture/login') && response.request().method() === 'POST'), page.keyboard.press('Enter')]);
            if (name === 'portal' && path === '/') await page.locator('.portal-app').first().waitFor();
            else await page.waitForURL(url => !url.pathname.endsWith('/sign-in'), { timeout: 15000 });
            await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          }
          await page.addScriptTag({ content: axe });
          const audit = await page.evaluate(async () => {
            const result = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'link-name', 'label', 'image-alt', 'html-has-lang', 'aria-valid-attr', 'aria-required-attr', 'aria-valid-attr-value'] } });
            return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target).slice(0, 8) })), incomplete: result.incomplete.map(item => item.id) };
          });
          const focus = [];
          const focusable = await page.evaluate(() => Array.from(document.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(el => { const style = getComputedStyle(el); return el.getClientRects().length > 0 && style.visibility !== 'hidden' && !el.closest('[inert],[aria-hidden="true"]'); }).length);
          for (let i = 0; i < 15; i++) {
            await page.keyboard.press('Tab');
            const current = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const style = getComputedStyle(el); return { tag: el.tagName, type: el.getAttribute('type'), isFocused: el.matches(':focus'), hasFocus: document.hasFocus(), id: el.id, classes: typeof el.className === 'string' ? el.className : '', outline: style.outlineStyle, outlineWidth: style.outlineWidth, shadow: style.boxShadow, visible: el.getClientRects().length > 0 }; });
            if (current) focus.push(current);
          }
          const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
          if (scroll > width + 1 || errors.length || audit.violations.length || (focusable > 0 && !focus.length) || focus.some(item => item.outline === 'none' && item.shadow === 'none')) failed = true;
          console.log(JSON.stringify({ app: name, mode, path, width, scroll, focusable, focusCount: focus.length, focusWithoutOutline: focus.filter(item => item.outline === 'none' && item.shadow === 'none').slice(0, 5), violations: audit.violations, incomplete: audit.incomplete, errors }));
        } catch (error) { failed = true; console.log(JSON.stringify({ app: name, mode, path, width, error: error.message })); }
        finally { await context.close(); }
      }
    } catch (error) { failed = true; console.log(JSON.stringify({ app: name, mode, error: error.message })); }
    finally { child.kill('SIGTERM'); if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]); if (child.exitCode === null) child.kill('SIGKILL'); }
  }
} finally { await browser.close(); }
if (failed) process.exitCode = 1;
