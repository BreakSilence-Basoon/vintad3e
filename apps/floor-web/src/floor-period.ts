// 메뉴 분석의 기간 선택. 프리셋은 "마지막 영업일에서 거꾸로 N일", 직접 입력은 from~to.
export const PERIOD_PRESETS = [
  { key: '7d', label: '최근 7일', days: 7 },
  { key: '28d', label: '최근 4주', days: 28 },
  { key: '84d', label: '최근 12주', days: 84 },
  { key: '365d', label: '최근 1년', days: 365 },
] as const;

export type PeriodPresetKey = (typeof PERIOD_PRESETS)[number]['key'];

export type PeriodRequest =
  | { preset: PeriodPresetKey; days: number }
  | { preset: 'custom'; from: string; to: string };

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  const roundTrip = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  return roundTrip === value;
}

// query: preset | from/to. 잘못된 값은 기본(최근 4주)으로 돌린다.
export function resolvePeriodRequest(query: {
  preset?: string;
  from?: string;
  to?: string;
}): PeriodRequest {
  const from = query.from?.trim();
  const to = query.to?.trim();

  if (from && to && isValidDate(from) && isValidDate(to) && from <= to) {
    return { preset: 'custom', from, to };
  }

  const preset =
    PERIOD_PRESETS.find((entry) => entry.key === query.preset) ??
    PERIOD_PRESETS[1];

  return { preset: preset.key, days: preset.days };
}

// 링크에 실을 기간 query 부분
export function periodQuery(request: PeriodRequest) {
  return request.preset === 'custom'
    ? { from: request.from, to: request.to }
    : { preset: request.preset };
}
