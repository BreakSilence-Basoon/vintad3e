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
            if (name === 'apparel' && path.startsWith('/admin/')) {
              const protectedPage = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
              if (!protectedPage?.ok() || new URL(page.url()).pathname !== path) throw new Error('admin page did not reopen after sign-in');
            }
            await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          }
          // Let route transitions settle before measuring their final contrast.
          await page.waitForTimeout(1200);
          await page.addScriptTag({ content: axe });
          const audit = await page.evaluate(async () => {
            const result = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'link-name', 'label', 'image-alt', 'html-has-lang', 'aria-valid-attr', 'aria-required-attr', 'aria-valid-attr-value'] } });
            return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target).slice(0, 8) })), incomplete: result.incomplete.map(item => ({ id: item.id, nodes: item.nodes.map(node => {
              let el; try { el = document.querySelector(node.target[0]); } catch {}
              const backgrounds = []; for (let cur = el; cur && backgrounds.length < 8; cur = cur.parentElement) { const style = getComputedStyle(cur); backgrounds.push({ color: style.backgroundColor, image: style.backgroundImage, opacity: style.opacity }); }
              const style = el && getComputedStyle(el);
              return { target: node.target, html: node.html, checks: node.any.map(check => ({ id: check.id, data: check.data, message: check.message })), foreground: el instanceof SVGElement && /^(text|tspan)$/i.test(el.tagName) ? style?.fill : style?.color, fontSize: style?.fontSize, fontWeight: style?.fontWeight, rect: el ? { x: el.getBoundingClientRect().x + window.scrollX, y: el.getBoundingClientRect().y + window.scrollY, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height } : null, backgrounds };
            }) })) };
          });
          // Sample actual rendered backgrounds with text hidden, including gradients.
          // Screenshots stay in memory; off-screen or non-RGB cases remain for manual review.
          const undecided = audit.incomplete.flatMap(rule => rule.id === 'color-contrast' ? rule.nodes : []);
          if (undecided.length) {
            const hidden = await page.addStyleTag({ content: '* { -webkit-text-fill-color: transparent !important; text-shadow: none !important; } svg text, svg tspan { fill: transparent !important; stroke: transparent !important; } select { background-image: none !important; }' });
            const canCapturePage = await page.evaluate(() => document.documentElement.scrollHeight <= 15000);
            if (canCapturePage) await page.evaluate(() => window.scrollTo(0, 0));
            const shot = await page.screenshot({ animations: 'disabled', fullPage: canCapturePage });
            await hidden.evaluate(el => el.remove());
            const measure = async (png, nodes) => page.evaluate(async ({ png, nodes }) => {
              const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
              const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
              const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
              const luminance = rgb => rgb.map(n => { const c = n / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
              return nodes.map(node => {
                const box = node.rect, components = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(node.foreground || '');
                if (!box || !components || box.width < 2 || box.height < 2 || box.x < 0 || box.y < 0 || box.x + box.width > canvas.width || box.y + box.height > canvas.height) return null;
                const text = components.slice(1).map(Number), samples = [];
                for (const y of [0.25, 0.5, 0.75]) for (const x of [0.2, 0.5, 0.8]) {
                  const pixel = Array.from(ctx.getImageData(Math.floor(box.x + box.width * x), Math.floor(box.y + box.height * y), 1, 1).data).slice(0, 3);
                  const [dark, light] = [luminance(text), luminance(pixel)].sort((a, b) => a - b);
                  samples.push({ background: pixel, ratio: Number(((light + 0.05) / (dark + 0.05)).toFixed(2)) });
                }
                return samples;
              });
            }, { png, nodes });
            const measurements = await measure(shot.toString('base64'), undecided);
            undecided.forEach((node, i) => { node.backgroundSamples = measurements[i]; });
            // A narrow table may hide a cell in a horizontal scroller; reveal it before sampling.
            for (const node of undecided.filter(node => !node.backgroundSamples && node.target.length === 1)) {
              try {
                const element = page.locator(node.target[0]).first();
                await element.scrollIntoViewIfNeeded({ timeout: 2000 });
                const rect = await element.boundingBox();
                const hiddenText = await page.addStyleTag({ content: '* { -webkit-text-fill-color: transparent !important; text-shadow: none !important; } svg text, svg tspan { fill: transparent !important; stroke: transparent !important; } select { background-image: none !important; }' });
                const scrolledShot = await page.screenshot({ animations: 'disabled' });
                await hiddenText.evaluate(el => el.remove());
                [node.backgroundSamples] = await measure(scrolledShot.toString('base64'), [{ ...node, rect }]);
              } catch { /* Keep unresolved when a node cannot be safely sampled. */ }
            }
          }
          const focus = [];
          const focusable = await page.evaluate(() => {
            window.__auditTabStops = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]')).filter(el => { const style = getComputedStyle(el); const closed = el.closest('details:not([open])'); const inClosedDetails = closed && !closed.querySelector(':scope > summary')?.contains(el); return el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0 && style.visibility !== 'hidden' && !el.closest('[inert],[aria-hidden="true"]') && !inClosedDetails; });
            return window.__auditTabStops.length;
          });
          const reached = new Set();
          for (let i = 0; i < Math.min(400, Math.max(30, focusable * 4 + 20)); i++) {
            await page.keyboard.press('Tab');
            const current = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const style = getComputedStyle(el); return { index: window.__auditTabStops.indexOf(el), tag: el.tagName, type: el.getAttribute('type'), isFocused: el.matches(':focus'), focusWithin: el.matches(':focus-within'), hasFocus: document.hasFocus(), id: el.id, classes: typeof el.className === 'string' ? el.className : '', outline: style.outlineStyle, outlineWidth: style.outlineWidth, shadow: style.boxShadow, visible: el.getClientRects().length > 0 }; });
            if (current) { focus.push(current); if (current.index >= 0) reached.add(current.index); }
            if (reached.size === focusable && focusable > 0) break;
          }
          // Focusing an off-screen gallery image scrolls it into view and can
          // disable an arrow midway through the first pass. Test any remaining
          // enabled arrow with an actual Tab from its preceding tab stop.
          for (let i = 0; i < focusable; i++) {
            if (reached.has(i)) continue;
            const prepared = await page.evaluate(index => {
              const target = window.__auditTabStops[index];
              if (!target?.isConnected || target.disabled || !target.closest('.bedroom-gallery-arrows')) return false;
              const stops = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]')).filter(el => { const style = getComputedStyle(el); const closed = el.closest('details:not([open])'); return el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0 && style.visibility !== 'hidden' && !el.closest('[inert],[aria-hidden="true"]') && !(closed && !closed.querySelector(':scope > summary')?.contains(el)); });
              const position = stops.indexOf(target);
              if (position < 1) return false;
              stops[position - 1].focus({ preventScroll: true });
              return document.activeElement === stops[position - 1];
            }, i);
            if (prepared) {
              await page.keyboard.press('Tab');
              const current = await page.evaluate(index => {
                const el = document.activeElement;
                if (el !== window.__auditTabStops[index]) return null;
                const style = getComputedStyle(el);
                return { index, tag: el.tagName, outline: style.outlineStyle, shadow: style.boxShadow };
              }, i);
              if (current) { reached.add(i); focus.push(current); }
            }
          }
          const unreachable = await page.evaluate(indices => window.__auditTabStops.filter((el, i) => el.isConnected && !el.disabled && !indices.includes(i)).map(el => ({ tag: el.tagName, type: el.getAttribute('type'), html: el.outerHTML.slice(0, 300) })), Array.from(reached));
          const summaryFailures = [];
          const summaries = page.locator('details > summary');
          for (let i = 0, count = await summaries.count(); i < count; i++) {
            const summary = summaries.nth(i);
            if (!await summary.isVisible()) continue;
            const before = await summary.evaluate(el => el.parentElement.open);
            await summary.focus(); await page.keyboard.press('Enter');
            const after = await summary.evaluate(el => el.parentElement.open);
            if (before === after) summaryFailures.push(i);
            else { await page.keyboard.press('Enter'); }
          }
          const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
          if (scroll > width + 1 || errors.length || audit.violations.length || summaryFailures.length || unreachable.length || (focusable > 0 && !focus.length) || focus.some(item => item.outline === 'none' && item.shadow === 'none')) failed = true;
          console.log(JSON.stringify({ app: name, mode, path, width, scroll, focusable, reached: reached.size, unreachable, focusCount: focus.length, summaryFailures, focusWithoutOutline: focus.filter(item => item.outline === 'none' && item.shadow === 'none').slice(0, 5), violations: audit.violations, incomplete: audit.incomplete.map(item => ({ id: item.id, count: item.nodes.length })), errors }));
          for (const rule of audit.incomplete) for (const node of rule.nodes) console.log(JSON.stringify({ record: 'incomplete-node', app: name, mode, path, width, rule: rule.id, ...node }));
        } catch (error) { failed = true; console.log(JSON.stringify({ app: name, mode, path, width, error: error.message })); }
        finally { await context.close(); }
      }
    } catch (error) { failed = true; console.log(JSON.stringify({ app: name, mode, error: error.message })); }
    finally { child.kill('SIGTERM'); if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]); if (child.exitCode === null) child.kill('SIGKILL'); }
  }
} finally { await browser.close(); }
if (failed) process.exitCode = 1;
