import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This independent copy also protects the checked-in reference file locally.
const expected = 'ecc79bb6aa51a39de998333a6fac0c462b662bb8495afc4369e18ea63490eb74';
const normalize = (text) => text.replace(/\r\n/g, '\n');
const read = (path) => normalize(readFileSync(path, 'utf8'));
const fail = (reason) => { console.error(`Founder note check failed: ${reason}`); process.exit(1); };

try {
  // CI executes the trusted base-branch copy, so a PR cannot replace this guard.
  if (read(fileURLToPath(import.meta.url)) !== read('scripts/check-founder-note.mjs')) fail('검사 스크립트 변경');
  if (read('scripts/founder-note.sha256') !== `${expected}\n`) fail('기준값 파일 변경');
  const text = read('README.md');
  const start = '<!-- founder-note:start -->';
  const end = '<!-- founder-note:end -->';
  const startAt = text.indexOf(start);
  const endAt = text.indexOf(end);
  if (startAt < 0 || endAt < 0 || startAt >= endAt || text.indexOf(start, startAt + start.length) !== -1 || text.indexOf(end, endAt + end.length) !== -1) fail('표지 누락 또는 중복');
  const content = text.slice(startAt + start.length, endAt);
  if (createHash('sha256').update(content, 'utf8').digest('hex') !== expected) fail('확정 본문 변경');
  // The note remains the first second-level section after the document title.
  if (!/^\s*#\s+[^\n]+\n/.test(text) || /^##\s/m.test(text.slice(0, startAt)) || !/^\s*---\s*\n\s*## 만든 사람의 말\s*\n/.test(content)) fail('확정 본문 위치 변경');
  console.log('Founder note check passed.');
} catch (error) {
  fail(error.message);
}
