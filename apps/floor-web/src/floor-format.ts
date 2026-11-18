// 화면 표기 규칙: 금액은 축약 없이 원 단위 전체 자릿수, 날짜는 한국어 요일 포함.
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const wonFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

export function formatWon(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${wonFormatter.format(Math.round(value))}원`;
}

export function formatCount(value: number | null | undefined, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${wonFormatter.format(Math.round(value))}${unit}`;
}

export function formatPercent(ratio: number | null | undefined) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return '-';
  }

  return `${(ratio * 100).toFixed(1)}%`;
}

// 전일·전주 대비: "+601,600원 (+91.3%)" / 기준값 0이면 비율 생략
export function formatDelta(current: number, base: number) {
  const diff = current - base;
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const amount = `${sign}${wonFormatter.format(Math.abs(Math.round(diff)))}원`;

  if (base <= 0) {
    return amount;
  }

  const ratio = (diff / base) * 100;
  return `${amount} (${sign}${Math.abs(ratio).toFixed(1)}%)`;
}

export function deltaTone(current: number, base: number): 'up' | 'down' | 'flat' {
  if (current > base) return 'up';
  if (current < base) return 'down';
  return 'flat';
}

export function parseBusinessDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBusinessDate(value: string, options: { withYear?: boolean } = {}) {
  const date = parseBusinessDate(value);

  if (!date) {
    return value;
  }

  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return options.withYear === false
    ? `${month}월 ${day}일 (${weekday})`
    : `${date.getUTCFullYear()}년 ${month}월 ${day}일 (${weekday})`;
}

export function formatShortBusinessDate(value: string) {
  const date = parseBusinessDate(value);

  if (!date) {
    return value;
  }

  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} (${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ISO(UTC) → "9월 19일 22:59" (KST)
export function formatKstDateTime(iso: string | null | undefined) {
  if (!iso) {
    return '-';
  }

  const time = new Date(iso).getTime();

  if (!Number.isFinite(time)) {
    return '-';
  }

  const kst = new Date(time + KST_OFFSET_MS);
  const hours = String(kst.getUTCHours()).padStart(2, '0');
  const minutes = String(kst.getUTCMinutes()).padStart(2, '0');

  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${hours}:${minutes}`;
}

export function formatHourLabel(hour: number) {
  return `${hour}시`;
}
