import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve, basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const apps = ['portal', 'timetable', 'apparel', 'supporters', 'partners', 'library', 'floor', 'creative', 'admin'];
const source = `import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const suffix = (await cookies()).get('vintad3e-recovery')?.value === 'ready' ? 'ready' : 'failed';
  const response = await fetch(process.env.VINTAD3E_RECOVERY_ORIGIN + '/' + suffix, { cache: 'no-store' });
  if (!response.ok) throw new Error('internal failure details');
  return <main><p>화면을 다시 열었습니다.</p></main>;
}`;
async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
const mock = createHttpServer((request, response) => { response.writeHead(request.url === '/ready' ? 200 : 503); response.end(); });
mock.listen(0, '127.0.0.1'); await once(mock, 'listening');
const mockOrigin = `http://127.0.0.1:${mock.address().port}`;
try {
  for (const name of apps) {
    const root = resolve(`apps/${name}-web`), appDir = join(root, 'src', 'app');
    const probe = await mkdtemp(join(appDir, 'recovery-probe-'));
    const port = await freePort(), origin = `http://127.0.0.1:${port}`;
    let child;
    try {
      await writeFile(join(probe, 'page.tsx'), source, { flag: 'wx' });
      const flag = `VINTAD3E_${name.toUpperCase()}_FIXTURE`;
      child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...process.env, NODE_ENV: 'development', VINTAD3E_RECOVERY_ORIGIN: mockOrigin, [flag]: '1', [`${flag}_ORIGIN`]: origin }, stdio: 'ignore' });
      let ready = false;
      for (let i = 0; i < 120; i++) { if (child.exitCode !== null) break; try { if ((await fetch(origin, { redirect: 'manual' })).status < 500) { ready = true; break; } } catch {} await delay(250); }
      assert.ok(ready, `${name}: server did not start`);
      for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 844 } });
        const page = await context.newPage();
        try {
          await page.goto(`${origin}/${basename(probe)}`, { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          const error = page.locator('[data-route-error]');
          await error.waitFor({ state: 'visible', timeout: 30000 });
          assert.match(await error.innerText(), /화면을 불러오지 못했습니다/);
          assert.ok(!(await error.innerText()).includes('internal failure details'));
          await context.addCookies([{ name: 'vintad3e-recovery', value: 'ready', url: origin }]);
          await error.getByRole('button', { name: '다시 시도' }).focus();
          await page.keyboard.press('Enter');
          await page.getByText('화면을 다시 열었습니다.', { exact: true }).waitFor({ timeout: 30000 });
          assert.equal(await page.locator('[data-route-error]').count(), 0);
          console.log(`${name} ${width}: failure and retry passed`);
        } finally { await context.close(); }
      }
    } finally {
      if (child) { child.kill('SIGTERM'); if (child.exitCode === null && child.signalCode === null) await Promise.race([once(child, 'exit'), delay(5000)]); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
      await rm(probe, { recursive: true });
    }
  }
} finally { await browser.close(); await new Promise(resolve => mock.close(resolve)); }
