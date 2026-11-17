export type SalesDateRange = "all" | "today" | "7d" | "30d" | "custom";
export type SalesSortDirection = "asc" | "desc";
export type SalesFilterFormState = {
  from: string;
  keyword: string;
  range: SalesDateRange;
  sortDirection: SalesSortDirection;
  to: string;
};

export type SalesFilters = SalesFilterFormState & {
  dateFrom: Date | null;
  dateTo: Date | null;
};

type Params = Record<string, string | string[] | undefined>;

const dayMs = 24 * 60 * 60 * 1000;

const dateRangeFilters: SalesDateRange[] = [
  "all",
  "today",
  "7d",
  "30d",
  "custom",
];

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const MAX_SALES_PAGE = 200;

export function parseSalesPage(value: string | string[] | undefined) {
  const page = Number(getSingleParam(value));

  if (!Number.isFinite(page) || page <= 0) {
    return 1;
  }

  return Math.min(Math.floor(page), MAX_SALES_PAGE);
}

function parseRangeFilter(value: string | string[] | undefined): SalesDateRange {
  const range = getSingleParam(value);

  return dateRangeFilters.includes(range as SalesDateRange)
    ? (range as SalesDateRange)
    : "all";
}

function parseSalesSortDirection(
  value: string | string[] | undefined,
): SalesSortDirection {
  return getSingleParam(value) === "asc" ? "asc" : "desc";
}

function parseDateInput(value: string | string[] | undefined) {
  const date = getSingleParam(value)?.trim() ?? "";

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function parseKeywordInput(value: string | string[] | undefined) {
  return (getSingleParam(value)?.trim() ?? "").slice(0, 80);
}

function getKstDateStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000+09:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + dayMs * days);
}

function getKstTodayInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function parseSalesFilters(params: Params): SalesFilters {
  const range = parseRangeFilter(params.range);
  const sortDirection = parseSalesSortDirection(params.sort);
  const from = parseDateInput(params.from);
  const keyword = parseKeywordInput(params.keyword);
  const to = parseDateInput(params.to);
  const todayStart = getKstDateStart(getKstTodayInputValue()) ?? new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (range === "today") {
    dateFrom = todayStart;
    dateTo = addDays(todayStart, 1);
  }

  if (range === "7d") {
    dateFrom = addDays(todayStart, -6);
    dateTo = addDays(todayStart, 1);
  }

  if (range === "30d") {
    dateFrom = addDays(todayStart, -29);
    dateTo = addDays(todayStart, 1);
  }

  if (range === "custom") {
    const fromStart = getKstDateStart(from);
    const toStart = getKstDateStart(to);

    dateFrom = fromStart;
    dateTo = toStart ? addDays(toStart, 1) : null;
  }

  return {
    dateFrom,
    dateTo,
    from,
    keyword,
    range,
    sortDirection,
    to,
  };
}

function appendSalesFilterParams(
  params: URLSearchParams,
  filters: SalesFilterFormState,
) {
  if (filters.range !== "all") {
    params.set("range", filters.range);
  }

  if (filters.range === "custom") {
    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }
  }

  if (filters.keyword) {
    params.set("keyword", filters.keyword);
  }

  if (filters.sortDirection !== "desc") {
    params.set("sort", filters.sortDirection);
  }
}

export function buildSalesHref(nextPage: number, filters: SalesFilterFormState) {
  const params = new URLSearchParams();

  appendSalesFilterParams(params, filters);

  if (nextPage > 1) {
    params.set("salesPage", String(nextPage));
  }

  const query = params.toString();

  return query ? `/sales?${query}` : "/sales";
}
