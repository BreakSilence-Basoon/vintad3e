const MAX_CSS_BYTES = 1024 * 1024;
const SPACE = /\s+/g;
export const normalizeValue = (value) => value.trim().replace(SPACE, ' ');

export function parseCss(source, { allowLegacyRules = false, allowedKeyframes = [] } = {}) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > MAX_CSS_BYTES) throw new Error('CSS_INPUT_LIMIT');
  if (!Array.isArray(allowedKeyframes) || allowedKeyframes.some(name => typeof name !== 'string' || !/^[A-Za-z_-][\w-]*$/.test(name))) throw new Error('CSS_KEYFRAME_CONTRACT_INVALID');
  let clean = '';
  let quote = '';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      clean += char;
      if (char === '\\') clean += source[++i] ?? '';
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
      clean += char;
    } else if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) throw new Error('CSS_UNCLOSED_COMMENT');
      clean += ' ';
      i = end + 1;
    } else clean += char;
  }
  if (quote) throw new Error('CSS_UNCLOSED_STRING');

  const records = [];
  const split = (text, delimiter) => {
    const values = [];
    let start = 0;
    let depth = 0;
    let string = '';
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (string) {
        if (char === '\\') i += 1;
        else if (char === string) string = '';
      } else if (char === '"' || char === "'") string = char;
      else if (char === '(' || char === '[') depth += 1;
      else if (char === ')' || char === ']') { if (--depth < 0) throw new Error('CSS_UNBALANCED_VALUE'); }
      else if (!depth && char === delimiter) { values.push(text.slice(start, i)); start = i + 1; }
    }
    if (depth || string) throw new Error('CSS_UNBALANCED_VALUE');
    values.push(text.slice(start));
    return values;
  };
  const blockEnd = (text, opening) => {
    let depth = 1;
    let string = '';
    for (let i = opening + 1; i < text.length; i += 1) {
      const char = text[i];
      if (string) {
        if (char === '\\') i += 1;
        else if (char === string) string = '';
      } else if (char === '"' || char === "'") string = char;
      else if (char === '{') { if (++depth > 32) throw new Error('CSS_NESTING_LIMIT'); }
      else if (char === '}' && --depth === 0) return i;
    }
    throw new Error('CSS_UNCLOSED_BLOCK');
  };
  const visit = (text, context = '', level = 0) => {
    if (level > 16) throw new Error('CSS_GROUPING_LIMIT');
    let position = 0;
    while (text.slice(position).trim()) {
      const open = text.indexOf('{', position);
      if (open < 0) throw new Error('CSS_UNSUPPORTED_STATEMENT');
      const prelude = normalizeValue(text.slice(position, open));
      if (!prelude || prelude.includes(';') || prelude.includes('}')) throw new Error('CSS_INVALID_PRELUDE');
      const close = blockEnd(text, open);
      const body = text.slice(open + 1, close);
      const pageRule = allowLegacyRules && /^@page(?:\s|$)/.test(prelude);
      if (prelude.startsWith('@') && !pageRule) {
        const namedKeyframe = /^@keyframes ([A-Za-z_-][\w-]*)$/.exec(prelude);
        const registeredKeyframe = namedKeyframe && allowedKeyframes.includes(namedKeyframe[1]);
        if (!/^@(media|supports|container|layer)\b/.test(prelude)
          && !(allowLegacyRules && /^@(?:-webkit-)?keyframes\b/.test(prelude))
          && !registeredKeyframe) throw new Error('CSS_UNSUPPORTED_AT_RULE');
        visit(body, context ? `${context} / ${prelude}` : prelude, level + 1);
      } else {
        if (body.includes('{') || body.includes('}')) throw new Error('CSS_UNSUPPORTED_NESTING');
        const selectors = split(prelude, ',').map(normalizeValue);
        for (const statement of split(body, ';').filter((item) => item.trim())) {
          const colon = statement.indexOf(':');
          if (colon <= 0) throw new Error('CSS_INVALID_DECLARATION');
          const property = statement.slice(0, colon).trim().toLowerCase();
          const value = normalizeValue(statement.slice(colon + 1));
          if (!/^(?:--[\w-]+|-?[a-z][a-z-]*)$/.test(property) || !value) throw new Error('CSS_INVALID_DECLARATION');
          for (const selector of selectors) records.push({ context, selector, property, value });
        }
      }
      position = close + 1;
    }
  };
  visit(clean);
  return records;
}

