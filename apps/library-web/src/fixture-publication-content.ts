export type SafeTag =
  | 'p'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'strong'
  | 'em'
  | 's'
  | 'blockquote'
  | 'pre'
  | 'code'
  | 'ul'
  | 'ol'
  | 'li'
  | 'br'
  | 'hr'
  | 'a'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td';
export type SafeContent =
  | string
  | { tag: SafeTag; children: SafeContent[]; href?: string };
export type AttachmentLink = { id: string; filename: string };
export const MAX_PUBLICATION_RESPONSE_BYTES = 1024 * 1024;
export function assertPublicationResponseBudget(value: unknown): void {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength >
    MAX_PUBLICATION_RESPONSE_BYTES
  )
    throw new Error('문서 응답 크기를 확인해 주세요.');
}
function assertContentBudget(nodes: SafeContent[]): void {
  let count = 0,
    textLength = 0;
  const visit = (items: SafeContent[], depth: number) => {
    if (depth > 32) throw new Error('문서 중첩이 너무 깊습니다.');
    for (const node of items) {
      if (++count > 10000) throw new Error('문서 요소가 너무 많습니다.');
      if (typeof node === 'string') {
        textLength += node.length;
        if (textLength > 131072) throw new Error('문서 크기를 확인해 주세요.');
      } else visit(node.children, depth + 1);
    }
  };
  visit(nodes, 0);
  assertPublicationResponseBudget(nodes);
}
export function isReadablePublicationContent(nodes: SafeContent[]): boolean {
  return nodes.some((node) =>
    typeof node === 'string'
      ? Boolean(node.trim())
      : isReadablePublicationContent(node.children),
  );
}
const allowed = new Set<string>([
  'p',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  's',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'br',
  'hr',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);
const suppressed = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
  'head',
  'form',
  'textarea',
  'noscript',
]);
const voidTags = new Set(['br', 'hr']);
/** Reconstruct a wire AST from a closed vocabulary, never source tags or arbitrary props. */
export function parseSafePublicationContent(
  value: unknown,
  id: string,
  attachments: AttachmentLink[],
): SafeContent[] | null {
  let count = 0;
  let textLength = 0;
  function parse(nodes: unknown, depth: number): SafeContent[] | null {
    if (!Array.isArray(nodes) || depth > 32) return null;
    const result: SafeContent[] = [];
    for (const value of nodes as unknown[]) {
      if (++count > 10000) return null;
      if (typeof value === 'string') {
        textLength += value.length;
        if (textLength > 131072) return null;
        result.push(value);
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
      const node = value as Record<string, unknown>;
      if (
        typeof node.tag !== 'string' ||
        !allowed.has(node.tag) ||
        Object.keys(node).some(
          (key) => !['tag', 'children', 'href'].includes(key),
        )
      )
        return null;
      const children = parse(node.children, depth + 1);
      if (!children) return null;
      const safe: Exclude<SafeContent, string> = {
        tag: node.tag as SafeTag,
        children,
      };
      if ('href' in node) {
        if (node.tag !== 'a' || typeof node.href !== 'string') return null;
        const internal = attachments.some(
          (file) =>
            node.href === `/api/publications/${id}/attachments/${file.id}`,
        );
        if (!internal && publicationLink(node.href, id, []) !== node.href)
          return null;
        safe.href = node.href;
      }
      result.push(safe);
    }
    return result;
  }
  const parsed = parse(value, 0);
  if (!parsed) return null;
  try {
    assertContentBudget(parsed);
    return parsed;
  } catch {
    return null;
  }
}
const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};
export function decodeContentEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos|nbsp);/gi,
    (original, value: string) => {
      if (value[0] !== '#') return entities[value.toLowerCase()] ?? original;
      const code =
        value[1].toLowerCase() === 'x'
          ? parseInt(value.slice(2), 16)
          : Number(value.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '\uFFFD';
    },
  );
}
export function publicationLink(
  value: string,
  publicationId: string,
  attachments: AttachmentLink[],
): string | undefined {
  const href = decodeContentEntities(value).trim();
  if (
    Array.from(href).some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        character === '\\',
    )
  )
    return undefined;
  if (href.startsWith('attachment:')) {
    const attachment = attachments.find(
      (file) => file.filename === href.slice('attachment:'.length),
    );
    if (
      attachment &&
      /^[0-9a-f-]{36}$/i.test(publicationId) &&
      /^[0-9a-f-]{36}$/i.test(attachment.id)
    ) {
      return `/api/publications/${publicationId.toLowerCase()}/attachments/${attachment.id.toLowerCase()}`;
    }
    return undefined;
  }
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' && !url.username && !url.password)
      return url.href;
  } catch {
    /* Unsupported links remain text. */
  }
  return undefined;
}

/** Parse to a closed React node vocabulary. No source tag/attribute is ever forwarded to the DOM. */
export function parsePublicationHtml(
  source: string,
  id: string,
  attachments: AttachmentLink[] = [],
): SafeContent[] {
  if (source.length > 131072) throw new Error('문서 크기를 확인해 주세요.');
  const root: SafeContent[] = [];
  const stack: Array<{ sourceTag: string; children: SafeContent[] }> = [
    { sourceTag: '', children: root },
  ];
  const hidden: string[] = [];
  let offset = 0;
  let nodes = 0;
  const append = (value: SafeContent) => {
    if (++nodes > 10000) throw new Error('문서 요소가 너무 많습니다.');
    stack[stack.length - 1].children.push(value);
  };
  while (offset < source.length) {
    const start = source.indexOf('<', offset);
    if (start < 0) {
      if (!hidden.length) append(decodeContentEntities(source.slice(offset)));
      break;
    }
    if (start > offset && !hidden.length)
      append(decodeContentEntities(source.slice(offset, start)));
    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      offset = end < 0 ? source.length : end + 3;
      continue;
    }
    let end = start + 1;
    let quote = '';
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === source.length) {
      if (!hidden.length) append(decodeContentEntities(source.slice(start)));
      break;
    }
    const token = source.slice(start + 1, end);
    offset = end + 1;
    const match = /^\s*(\/?)\s*([a-z][a-z0-9]*)\b/i.exec(token);
    if (!match) continue;
    const closing = Boolean(match[1]);
    const sourceTag = match[2].toLowerCase();
    if (hidden.length) {
      if (closing && sourceTag === hidden[hidden.length - 1]) hidden.pop();
      else if (!closing && suppressed.has(sourceTag) && !/\/\s*$/.test(token))
        hidden.push(sourceTag);
      continue;
    }
    if (suppressed.has(sourceTag)) {
      if (!closing) hidden.push(sourceTag);
      continue;
    }
    if (closing) {
      const position = stack
        .map((entry) => entry.sourceTag)
        .lastIndexOf(sourceTag);
      if (position > 0) stack.splice(position);
      continue;
    }
    const mapped =
      sourceTag === 'h1'
        ? 'h2'
        : sourceTag === 'b'
          ? 'strong'
          : sourceTag === 'i'
            ? 'em'
            : sourceTag;
    if (!allowed.has(mapped)) continue;
    const node: Exclude<SafeContent, string> = {
      tag: mapped as SafeTag,
      children: [],
    };
    if (mapped === 'a') {
      const attribute =
        /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
          token.slice(match[0].length),
        );
      if (attribute)
        node.href = publicationLink(
          attribute[1] ?? attribute[2] ?? attribute[3],
          id,
          attachments,
        );
    }
    append(node);
    if (!voidTags.has(mapped) && !/\/\s*$/.test(token)) {
      if (stack.length >= 32) throw new Error('문서 중첩이 너무 깊습니다.');
      stack.push({ sourceTag, children: node.children });
    }
  }
  assertContentBudget(root);
  return root;
}

function markdownInline(
  text: string,
  id: string,
  attachments: AttachmentLink[],
  depth = 0,
): SafeContent[] {
  if (depth >= 12) return [text];
  const result: SafeContent[] = [];
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) result.push(text.slice(offset, match.index));
    const token = match[0];
    if (token.startsWith('`'))
      result.push({ tag: 'code', children: [token.slice(1, -1)] });
    else if (token.startsWith('**'))
      result.push({
        tag: 'strong',
        children: markdownInline(
          token.slice(2, -2),
          id,
          attachments,
          depth + 1,
        ),
      });
    else if (token.startsWith('*'))
      result.push({
        tag: 'em',
        children: markdownInline(
          token.slice(1, -1),
          id,
          attachments,
          depth + 1,
        ),
      });
    else {
      const divider = token.indexOf('](');
      result.push({
        tag: 'a',
        children: [token.slice(1, divider)],
        href: publicationLink(token.slice(divider + 2, -1), id, attachments),
      });
    }
    offset = match.index + token.length;
  }
  if (offset < text.length) result.push(text.slice(offset));
  return result;
}
function markdownTableCells(line: string): string[] {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  let inCode = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === '\\' && value[index + 1] === '|') {
      cell += '|';
      index++;
    } else if (character === '`') {
      inCode = !inCode;
      cell += character;
    } else if (character === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parsePublicationMarkdown(
  source: string,
  id: string,
  attachments: AttachmentLink[] = [],
): SafeContent[] {
  if (source.length > 131072) throw new Error('문서 크기를 확인해 주세요.');
  const result: SafeContent[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let fence = '';
  const flush = () => {
    if (paragraph.length) {
      result.push({
        tag: 'p',
        children: markdownInline(paragraph.join('\n'), id, attachments),
      });
      paragraph = [];
    }
  };
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (code !== null) {
      if (line.trim().startsWith(fence)) {
        result.push({
          tag: 'pre',
          children: [{ tag: 'code', children: [code.join('\n')] }],
        });
        code = null;
      } else code.push(line);
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      flush();
      fence = line.trim().slice(0, 3);
      code = [];
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const divider = lines[lineIndex + 1];
    if (line.includes('|') && divider?.includes('|')) {
      const headings = markdownTableCells(line);
      const separators = markdownTableCells(divider);
      if (headings.length === separators.length && separators.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        flush();
        const row = (cells: string[], tag: 'th' | 'td'): SafeContent => ({
          tag: 'tr',
          children: headings.map((_, index) => ({ tag, children: markdownInline(cells[index] ?? '', id, attachments) })),
        });
        const body: SafeContent[] = [];
        lineIndex++;
        while (lineIndex + 1 < lines.length && lines[lineIndex + 1].trim() && lines[lineIndex + 1].includes('|')) {
          body.push(row(markdownTableCells(lines[++lineIndex]), 'td'));
        }
        result.push({ tag: 'table', children: [
          { tag: 'thead', children: [row(headings, 'th')] },
          { tag: 'tbody', children: body },
        ] });
        continue;
      }
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      result.push({
        tag: `h${Math.max(2, heading[1].length)}` as SafeTag,
        children: markdownInline(heading[2], id, attachments),
      });
      continue;
    }
    const list = /^\s*(?:([-*+])|\d+\.)\s+(.+)$/.exec(line);
    if (list) {
      flush();
      const tag = list[1] ? 'ul' : 'ol';
      const previous = result[result.length - 1];
      const item: SafeContent = {
        tag: 'li',
        children: markdownInline(list[2], id, attachments),
      };
      if (typeof previous === 'object' && previous.tag === tag)
        previous.children.push(item);
      else result.push({ tag, children: [item] });
      continue;
    }
    if (line.startsWith('> ')) {
      flush();
      result.push({
        tag: 'blockquote',
        children: markdownInline(line.slice(2), id, attachments),
      });
      continue;
    }
    paragraph.push(line);
  }
  if (code !== null)
    result.push({
      tag: 'pre',
      children: [{ tag: 'code', children: [code.join('\n')] }],
    });
  flush();
  assertContentBudget(result);
  return result;
}
