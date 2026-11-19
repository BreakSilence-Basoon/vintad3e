export type IdentifierKind = 'resident' | 'foreign';
export type AccountantEntry = { name: string; identifierKind: IdentifierKind; identifier: string; paidAmount: string };
export type EntryErrors = Partial<Record<keyof AccountantEntry, string>>;
export type MessageResult = { ok: true; text: string } | { ok: false; monthError?: string; entries: EntryErrors[] };

const invalidText = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const amountPattern = /^(?:\d{1,18}|[1-9]\d{0,2}(?:,\d{3}){1,5})$/;
export const identifierLabel = (kind: IdentifierKind) => kind === 'foreign' ? '외국인등록번호' : '주민등록번호';

// Recorded paid amounts only; no withholding calculation or sending.
// Only shape validation; never citizenship, birth or checksum inference.
export function buildAccountantMessage(month: string, entries: readonly AccountantEntry[], revealIdentifiers = false): MessageResult {
  const monthError = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && Number(month.slice(0, 4)) >= 1900 ? undefined : '대상 연월을 선택해 주세요.';
  const errors = entries.map(entry => {
    const error: EntryErrors = {};
    if (!entry.name.trim() || entry.name.trim().length > 100 || invalidText.test(entry.name)) error.name = '이름을 한 줄로 입력해 주세요. (100자 이내)';
    if (entry.identifierKind !== 'resident' && entry.identifierKind !== 'foreign') error.identifierKind = '번호 종류를 선택해 주세요.';
    if (!/^\d{6}-?\d{7}$/.test(entry.identifier.trim())) error.identifier = '번호 13자리를 확인해 주세요. 하이픈은 생략해도 됩니다.';
    if (!amountPattern.test(entry.paidAmount.trim())) error.paidAmount = '입금한 금액을 원 단위 숫자로 입력해 주세요. (18자리 이내)';
    return error;
  });
  if (monthError || !entries.length || errors.some(error => Object.keys(error).length)) return { ok: false, monthError, entries: errors };
  const [year, monthNumber] = month.split('-');
  const lines = entries.map(entry => {
    const digits = entry.identifier.trim().replace('-', '');
    const number = revealIdentifiers ? `${digits.slice(0, 6)}-${digits.slice(6)}` : '******-*******';
    const amount = BigInt(entry.paidAmount.trim().replaceAll(',', '')).toLocaleString('ko-KR');
    return `${entry.name.trim()} ${number} ${amount}원`;
  });
  // Preserve the selected year and the order name, identifier, amount.
  return { ok: true, text: `${year}년 ${Number(monthNumber)}월 디제이들 원천징수 정보\n\n${lines.join('\n')}` };
}

export async function copyAccountantMessage(month: string, entries: readonly AccountantEntry[], writeText: (text: string) => Promise<void>): Promise<'copied' | 'invalid' | 'failed'> {
  const result = buildAccountantMessage(month, entries, true);
  if (!result.ok) return 'invalid';
  try { await writeText(result.text); return 'copied'; }
  // Never reflect clipboard/browser exception text or input values into a diagnostic.
  catch { return 'failed'; }
}
