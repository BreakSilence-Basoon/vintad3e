const connectionError = /EMAXCONNSESSION|max clients|max client connections|pool_size|too many (?:clients|connections)|connection (?:timeout|timed out|terminated)|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|Failed to fetch/i;
const internalError = /Prisma|(?:postgres(?:ql)?|https?):\/\/|\bSELECT\b.+\bFROM\b|\b(?:TypeError|SyntaxError|ReferenceError):|\bat\s+\S+\.(?:js|ts):\d/i;

export function adminErrorMessage(
  error: unknown,
  fallback = '요청을 처리하지 못했습니다. 잠시 후 내역을 확인해 주세요.',
): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (connectionError.test(message)) {
    return '서버 연결이 잠시 원활하지 않습니다. 잠시 후 내역을 새로고침해 주세요.';
  }
  if (!/[가-힣]/u.test(message) || internalError.test(message)) return fallback;
  return message;
}
