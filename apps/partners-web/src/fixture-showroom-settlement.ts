// 쇼룸 정산 계산기 도우미: 기간(영업일 기준) 계산과 넘겨줄 금액.

export type SettlementRange = 'this_month' | 'last_month' | '30d' | 'custom';

const BUSINESS_DAY_START = 'T00:00:00+09:00';

export function seoulToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// 달력 날짜 범위(시작일~종료일, 둘 다 포함). 영업일 기준 오늘 = 오늘.
export function resolveSettlementDates(
  range: SettlementRange,
  custom: { from: string; to: string },
  now = new Date(),
) {
  const today = seoulToday(now);
  const monthStart = `${today.slice(0, 7)}-01`;

  if (range === 'this_month') {
    return { from: monthStart, to: today };
  }

  if (range === 'last_month') {
    const lastMonthEnd = addDays(monthStart, -1);
    return { from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd };
  }

  if (range === '30d') {
    return { from: addDays(today, -29), to: today };
  }

  return custom;
}

// API 조회용 시각: 시작일 자정 ~ 종료일 다음 날 자정(미포함).
export function toBusinessDayBounds(dates: { from: string; to: string }) {
  if (!isDateInput(dates.from) || !isDateInput(dates.to) || dates.from > dates.to) {
    return null;
  }

  const exclusiveEnd = addDays(dates.to, 1);
  if (!isDateInput(exclusiveEnd)) return null;
  return {
    from: `${dates.from}${BUSINESS_DAY_START}`,
    to: `${exclusiveEnd}${BUSINESS_DAY_START}`,
  };
}

export function parsePercent(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const percent = Number(trimmed);

  return Number.isFinite(percent) && percent >= 0 && percent <= 100
    ? percent
    : null;
}

export function payoutAmount(amount: number, percent: number) {
  return Math.round((amount * percent) / 100);
}

// 브랜드 검색: 대소문자 구분 없이 이름·코드, 그리고 한글로 부르는 이름으로도 찾는다.
const BRAND_SEARCH_ALIASES: Record<string, string[]> = {};

type SearchableBrand = { code: string; name: string };

export type SettlementSelection = {
  brandCode: string;
  dates: { from: string; to: string };
  bounds: { from: string; to: string };
  percent: number | null;
};

// [AI 판단] 입력 중인 조건과 결과의 조건을 분리한다. 적용할 때만 영업일과 비율을 고정한다.
export function createSettlementSelection(
  brands: Array<SearchableBrand & { defaultPercent: number | null }>,
  draft: {
    brandQuery: string;
    range: SettlementRange;
    customDates: { from: string; to: string };
    percentInput: string;
    percentEdited: boolean;
  },
  now = new Date(),
): SettlementSelection | null {
  const brand = findSettlementBrand(brands, draft.brandQuery);
  const dates = resolveSettlementDates(draft.range, draft.customDates, now);
  const bounds = toBusinessDayBounds(dates);

  if (!brand || !bounds) {
    return null;
  }

  return {
    brandCode: brand.code,
    dates: { ...dates },
    bounds,
    percent: parsePercent(
      draft.percentEdited
        ? draft.percentInput
        : brand.defaultPercent === null
          ? ''
          : String(brand.defaultPercent),
    ),
  };
}

export function findSettlementBrand<T extends SearchableBrand>(
  brands: T[],
  query: string,
) {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return null;
  }

  const keys = (brand: T) =>
    [brand.name, brand.code, ...(BRAND_SEARCH_ALIASES[brand.code] ?? [])].map(
      (value) => value.toLowerCase(),
    );
  const exact = brands.find((brand) => keys(brand).includes(needle));

  if (exact) {
    return exact;
  }

  const partial = brands.filter((brand) =>
    keys(brand).some((key) => key.includes(needle)),
  );

  return partial.length === 1 ? partial[0] : null;
}
