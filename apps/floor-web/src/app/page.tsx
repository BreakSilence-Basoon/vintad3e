import { Button } from '@vintad3e/ui/components';
import Link from 'next/link';
import { FloorRevenueTrend } from '../floor-revenue-trend';
import {
  type FloorDailyResponse,
  type FloorTotals,
  fixtureFloorDaily,
} from '../floor-fixture-daily';
import {
  WEEKDAY_LABELS,
  deltaTone,
  formatBusinessDate,
  formatCount,
  formatDelta,
  formatHourLabel,
  formatKstDateTime,
  formatShortBusinessDate,
  formatWon,
  parseBusinessDate,
} from '../floor-format';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function shiftDate(value: string, days: number) {
  const date = parseBusinessDate(value);

  if (!date) {
    return value;
  }

  const shifted = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

type MetricKey = 'fnbNet' | 'fnbOrderCount' | 'fnbPerOrder';

const comparisonRows: Array<{ key: MetricKey; label: string; kind: 'won' | 'count' }> = [
  { key: 'fnbNet', label: 'F&B 매출', kind: 'won' },
  { key: 'fnbOrderCount', label: 'F&B 주문 수', kind: 'count' },
  { key: 'fnbPerOrder', label: '주문당 F&B', kind: 'won' },
];

function metricValue(totals: FloorTotals, key: MetricKey) {
  const value = totals[key];
  return typeof value === 'number' ? value : 0;
}

function formatMetric(value: number, kind: 'won' | 'count') {
  return kind === 'won' ? formatWon(value) : formatCount(value, '건');
}

function DeltaCell({
  current,
  base,
  kind,
}: {
  current: number;
  base: number;
  kind: 'won' | 'count';
}) {
  const tone = deltaTone(current, base);
  const text =
    kind === 'won'
      ? formatDelta(current, base)
      : `${current - base > 0 ? '+' : ''}${formatCount(current - base, '건')}`;

  return (
    <span className={`floor-delta floor-delta--${tone}`}>
      <span className="sr-only">
        {tone === 'up' ? '증가' : tone === 'down' ? '감소' : '변화 없음'}
      </span>
      {text}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="floor-summary__tile">
      <span className="floor-summary__label">{label}</span>
      <strong className="floor-summary__value">{value}</strong>
      {note ? <span className="floor-summary__note">{note}</span> : null}
    </div>
  );
}

function DailyBrief({ data }: { data: FloorDailyResponse }) {
  const { totals, comparisons } = data;
  const previous = comparisons.previousDay;
  const lastWeek = comparisons.lastWeekSameDay;
  const isEmpty = totals.fnbNet === 0 && data.menus.length === 0;
  const maxHourNet = Math.max(0, ...data.hours.map((row) => row.fnbNet));
  const categoryOrder = data.categories.map((row) => row.category);
  const menusByCategory = categoryOrder.map((category) => ({
    category,
    rows: data.menus.filter((row) => row.category === category),
  }));

  if (isEmpty) {
    return (
      <section className="floor-section floor-section--empty" aria-label="빈 영업일">
        <p>이 영업일에는 반영된 F&B 판매가 없습니다.</p>
        <p className="floor-section__hint">
          마지막으로 반영된 결제는 {formatKstDateTime(data.lastSoldAt)}입니다.
          {data.latestBusinessDate !== data.businessDate ? (
            <>
              {' '}
              <Link href={`/?date=${data.latestBusinessDate}`}>
                {formatBusinessDate(data.latestBusinessDate, { withYear: false })} 브리핑 보기
              </Link>
            </>
          ) : null}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="floor-summary" aria-label="영업일 요약">
        <SummaryTile
          label="F&B 매출"
          value={formatWon(totals.fnbNet)}
          note={`전일 ${formatDelta(totals.fnbNet, previous.totals.fnbNet)}`}
        />
        <SummaryTile
          label="F&B 주문 수"
          value={formatCount(totals.fnbOrderCount, '건')}
          note="F&B가 포함된 주문 기준"
        />
        <SummaryTile
          label="주문당 F&B"
          value={formatWon(totals.fnbPerOrder)}
          note={`전주 ${WEEKDAY_LABELS[lastWeek.weekday]}요일 ${formatDelta(totals.fnbPerOrder ?? 0, lastWeek.totals.fnbPerOrder ?? 0)}`}
        />
      </section>

      <section className="dashboard-panel floor-section" aria-labelledby="floor-compare-title">
        <div className="dashboard-panel__header">
          <h2 id="floor-compare-title">전일 · 전주 같은 요일 비교</h2>
        </div>
        <div className="floor-table-wrap">
          <table className="simple-table floor-table floor-table--compare">
            <caption className="sr-only">
              지표별 오늘, 전일, 전주 같은 요일 값과 차이
            </caption>
            <thead>
              <tr>
                <th scope="col">지표</th>
                <th scope="col" className="floor-table__num">
                  {formatShortBusinessDate(data.businessDate)}
                </th>
                <th scope="col" className="floor-table__num">
                  전일 {formatShortBusinessDate(previous.businessDate)}
                </th>
                <th scope="col" className="floor-table__num">
                  전주 {formatShortBusinessDate(lastWeek.businessDate)}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const current = metricValue(totals, row.key);
                const prev = metricValue(previous.totals, row.key);
                const week = metricValue(lastWeek.totals, row.key);

                return (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td className="floor-table__num">
                      <strong>{formatMetric(current, row.kind)}</strong>
                    </td>
                    <td className="floor-table__num">
                      <span>{formatMetric(prev, row.kind)}</span>
                      <DeltaCell current={current} base={prev} kind={row.kind} />
                    </td>
                    <td className="floor-table__num">
                      <span>{formatMetric(week, row.kind)}</span>
                      <DeltaCell current={current} base={week} kind={row.kind} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-panel floor-section" aria-labelledby="floor-hours-title">
        <div className="dashboard-panel__header">
          <h2 id="floor-hours-title">시간대별 F&B</h2>
        </div>
        <div className="floor-table-wrap">
          <table className="simple-table floor-table floor-table--hours">
            <caption className="sr-only">시간대별 F&B 매출, 잔·개 수, 주문 수</caption>
            <thead>
              <tr>
                <th scope="col">시간대</th>
                <th scope="col">매출</th>
                <th scope="col" className="floor-table__num">수량</th>
                <th scope="col" className="floor-table__num">주문</th>
              </tr>
            </thead>
            <tbody>
              {data.hours.map((row) => (
                <tr key={row.hour} className={row.fnbNet === 0 ? 'is-quiet' : undefined}>
                  <th scope="row">{formatHourLabel(row.hour)}</th>
                  <td>
                    <span className="floor-bar" aria-hidden="true">
                      <span
                        className="floor-bar__fill"
                        style={{
                          width: `${maxHourNet > 0 ? Math.round((row.fnbNet / maxHourNet) * 100) : 0}%`,
                        }}
                      />
                    </span>
                    <span className="floor-bar__value">{formatWon(row.fnbNet)}</span>
                  </td>
                  <td className="floor-table__num">{formatCount(row.fnbQuantity)}</td>
                  <td className="floor-table__num">{formatCount(row.orderCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-panel floor-section" aria-labelledby="floor-menus-title">
        <div className="dashboard-panel__header">
          <h2 id="floor-menus-title">메뉴별 판매</h2>
          <p>
            F&B {formatCount(totals.fnbQuantity)}개
          </p>
        </div>
        <div className="floor-table-wrap">
          <table className="simple-table floor-table floor-table--menus">
            <caption className="sr-only">카테고리별 메뉴 판매 수량과 매출</caption>
            <thead>
              <tr>
                <th scope="col">메뉴</th>
                <th scope="col" className="floor-table__num">수량</th>
                <th scope="col" className="floor-table__num">매출</th>
                <th scope="col" className="floor-table__num">단가</th>
              </tr>
            </thead>
            {menusByCategory.map((group) => {
              const categoryTotal = data.categories.find(
                (row) => row.category === group.category,
              );

              return (
                <tbody key={group.category} className="floor-table__group">
                  <tr className="floor-table__group-row">
                    <th scope="rowgroup">{group.category}</th>
                    <td className="floor-table__num">
                      {formatCount(categoryTotal?.quantity ?? 0)}
                    </td>
                    <td className="floor-table__num">{formatWon(categoryTotal?.net ?? 0)}</td>
                    <td className="floor-table__num" aria-hidden="true" />
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={`${row.category}-${row.productName}`}>
                      <th scope="row" className="floor-table__menu">
                        {row.productName}
                      </th>
                      <td className="floor-table__num">{formatCount(row.quantity)}</td>
                      <td className="floor-table__num">{formatWon(row.net)}</td>
                      <td className="floor-table__num">{formatWon(row.listUnitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
    </>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const requestedDate = single(params.date)?.trim();
  const validDate = requestedDate && parseBusinessDate(requestedDate) ? requestedDate : undefined;

  let data: FloorDailyResponse | null = null;
  let loadError: string | null = null;

  try {
    data = fixtureFloorDaily(process.env.NODE_ENV, process.env.VINTAD3E_FLOOR_FIXTURE, new Date(), validDate);
  } catch {
    loadError = '판매 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침하고, 계속되면 관리자에게 알려주세요.';
  }

  const businessDate = data?.businessDate ?? validDate ?? '';
  const canGoForward = Boolean(data && data.businessDate < data.latestBusinessDate);

  return (
    <main className="floor-console floor-page">
      <header className="floor-page__header">
        <div>
          <h1>
            {businessDate ? `${formatBusinessDate(businessDate)} 브리핑` : '영업일 브리핑'}
          </h1>
          {data ? (
            <p className="floor-page__description">
              Toss 결제 기준 · {formatKstDateTime(data.lastSoldAt)} 결제까지 반영
            </p>
          ) : null}
        </div>
        {businessDate ? (
          <form className="floor-date-nav" method="get" action="/">
            <Link
              className="button button--ghost button--small"
              href={`/?date=${shiftDate(businessDate, -1)}`}
              aria-label="전날 영업일"
            >
              ← 전날
            </Link>
            <label className="floor-date-nav__field">
              <span className="sr-only">영업일 선택</span>
              <input type="date" name="date" defaultValue={businessDate} max={data?.latestBusinessDate} />
            </label>
            <Button type="submit" variant="primary" size="small" profile="timetable">
              보기
            </Button>
            {canGoForward ? (
              <Link
                className="button button--ghost button--small"
                href={`/?date=${shiftDate(businessDate, 1)}`}
                aria-label="다음 영업일"
              >
                다음날 →
              </Link>
            ) : null}
          </form>
        ) : null}
      </header>

      {loadError ? (
        <section className="floor-section floor-section--error" role="alert">
          <p>{loadError}</p>
        </section>
      ) : null}

      {data ? <DailyBrief data={data} /> : null}
      <FloorRevenueTrend params={params} />
    </main>
  );
}
