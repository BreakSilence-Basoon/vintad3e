// [운영 담당자 개발자] 2026-11-07, HQ 세션 전달: 토스트 본문은 문장마다 줄을 바꾼다.
// [운영 담당자 개발자] 2026-11-07, HQ 세션 전달: "두 문장 이내로 줄바꿈도 한 번만 일어나게".
// 정본: docs/ops/design/internal-console-design-rules.md §15 "toast 글자 배치".
// 저장된 문구는 바꾸지 않고 렌더 시점에만 나눈다. 화면에서는 CSS white-space: pre-line이 \n을 줄바꿈으로 그린다.

// [AI 판단] 운영 담당자 개발자의 Claude: 아래 세부 기준은 위 지시를 코드로 옮기려고 정했다.
// 잘못 붙는 쪽이 잘못 나뉘는 쪽보다 덜 해로우므로, 애매하면 나누지 않는다.
const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'etc', 'vs', 'no', 'mr', 'mrs', 'ms', 'dr', 'inc', 'ltd', 'co', 'corp', 'a.m', 'p.m',
]);
const OPENERS = new Set('([{「『《〈“‘');
const CLOSERS = new Set(')]}」』》〉”’');
const BOUNDARY = /([.?!]+)([)\]}」』》〉”’"']*)\s+(?=\S)/g;
const LEADING_OPENERS = /^[([{「『《〈“‘"']+/;

function isInsideBrackets(text: string) {
  let depth = 0;
  for (const character of text) {
    if (OPENERS.has(character)) depth += 1;
    else if (CLOSERS.has(character)) depth -= 1;
  }
  return depth > 0;
}

function isSentenceEnd(sentence: string, terminators: string) {
  // 말줄임표는 문장 중간의 쉼이다.
  if (/^\.{2,}$/.test(terminators)) return false;
  if (terminators !== '.') return true;
  const token = (sentence.split(/\s/).at(-1) ?? '').replace(LEADING_OPENERS, '');
  // 숫자만 있는 토큰: 한국어 날짜(2026. 11. 7.)와 목록 번호(1. 항목).
  if (/^[\d,]+$/.test(token)) return false;
  return !ABBREVIATIONS.has(token.toLowerCase()) && !/^(?:[A-Za-z]\.)+[A-Za-z]$/.test(token);
}

function splitLine(line: string) {
  const sentences: string[] = [];
  let start = 0;
  for (const match of line.matchAll(BOUNDARY)) {
    const terminatorAt = match.index;
    const closersEnd = terminatorAt + match[1].length + match[2].length;
    if (!isSentenceEnd(line.slice(start, terminatorAt), match[1])) continue;
    if (isInsideBrackets(line.slice(start, closersEnd))) continue;
    sentences.push(line.slice(start, closersEnd));
    start = terminatorAt + match[0].length;
  }
  sentences.push(line.slice(start));
  return sentences;
}

// 호출부가 넣은 \n은 그대로 줄바꿈으로 존중하고, 그 안에서 문장을 나눈다.
export function splitToastSentences(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap(splitLine)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

// [AI 판단] 운영 담당자 개발자의 Claude(HQ 세션): 넘치는 문장은 그리지 않되 잘린 사실이 보이게 …를 붙인다.
const MAX_TOAST_LINES = 2;

export function formatToastText(text: string): string {
  const lines = splitToastSentences(text);
  if (lines.length <= MAX_TOAST_LINES) return lines.join('\n');
  return `${lines.slice(0, MAX_TOAST_LINES).join('\n')}…`;
}
