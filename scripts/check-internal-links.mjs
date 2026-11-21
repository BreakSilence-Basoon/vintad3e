import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';

const markdown = new MarkdownIt({ html: true });
const isMarkdown = name => /\.md$/i.test(name);
const external = value => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);

function htmlAttributes(html, attributes) {
  const result = [];
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of clean.matchAll(/<([a-z][\w-]*)\b([^>]*?)>/gi)) {
    for (const attr of match[2].matchAll(/\b([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      const name = attr[1].toLowerCase();
      if (attributes.includes(name) && (name !== 'name' || match[1].toLowerCase() === 'a')) result.push(attr[2] ?? attr[3] ?? attr[4]);
    }
  }
  return result;
}

function headingText(tokens) {
  return (tokens ?? []).map(token => {
    if (token.type === 'text' || token.type === 'code_inline') return token.content;
    if (token.type === 'image') return headingText(token.children) || token.content;
    if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
    return '';
  }).join('');
}

function analyze(content) {
  const env = {};
  const tokens = markdown.parse(content, env);
  const anchors = new Set();
  const links = [];
  for (const reference of Object.values(env.references ?? {})) links.push({ href: reference.href, line: null });
  const slugger = new GithubSlugger();
  const inspectHtml = (text, line) => {
    for (const id of htmlAttributes(text, ['id', 'name'])) anchors.add(id);
    for (const href of htmlAttributes(text, ['href', 'src'])) links.push({ href: markdown.utils.unescapeAll(href), line });
  };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const line = (token.map?.[0] ?? 0) + 1;
    if (token.type === 'heading_open') anchors.add(slugger.slug(headingText(tokens[index + 1]?.children)));
    if (token.type === 'html_block') inspectHtml(token.content, line);
    if (token.type !== 'inline') continue;
    for (const child of token.children ?? []) {
      if (child.type === 'link_open' || child.type === 'image') {
        const href = child.attrGet(child.type === 'image' ? 'src' : 'href');
        if (href !== null) links.push({ href, line });
      } else if (child.type === 'html_inline') inspectHtml(child.content, line);
    }
  }
  return { anchors, links };
}

// The file list comes from Git, so ignored build output cannot hide a missing target.
export function checkInternalLinks(files, documents) {
  const tracked = new Set(files.map(name => name.replaceAll('\\', '/')));
  const parsed = new Map([...documents].map(([name, content]) => [name, analyze(content)]));
  const errors = [];
  let checked = 0;
  for (const [source, doc] of parsed) {
    for (const { href, line } of doc.links) {
      if (!href || external(href)) continue;
      checked++;
      try {
        const hash = href.indexOf('#');
        const rawPath = (hash < 0 ? href : href.slice(0, hash)).split('?')[0];
        const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
        const decoded = decodeURIComponent(rawPath);
        const normalized = decoded ? path.posix.normalize(decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(source), decoded)) : source;
        const target = normalized === './' ? '.' : normalized;
        if (target === '..' || target.startsWith('../')) throw new Error('저장소 밖 경로');
        const directory = target === '.' || [...tracked].some(name => name.startsWith(`${target.replace(/\/$/, '')}/`));
        if (!tracked.has(target) && !directory) throw new Error('파일 또는 폴더가 없음');
        if (fragment && isMarkdown(target) && !parsed.get(target)?.anchors.has(fragment)) throw new Error('제목 앵커가 없음');
      } catch (error) {
        errors.push({ source, line, href, reason: error instanceof URIError ? '잘못된 URL 인코딩' : error.message });
      }
    }
  }
  return { checked, errors };
}

export function checkRepository(root) {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const documents = new Map(files.filter(isMarkdown).map(name => [name, readFileSync(path.join(root, name), 'utf8')]));
  return { documents: documents.size, ...checkInternalLinks(files, documents) };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = checkRepository(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  for (const error of result.errors) console.error(`${error.source}${error.line ? `:${error.line}` : ''}: ${error.href} — ${error.reason}`);
  console.log(`Markdown ${result.documents}개, 내부 링크 ${result.checked}개 확인: 오류 ${result.errors.length}개`);
  if (result.errors.length) process.exitCode = 1;
}
