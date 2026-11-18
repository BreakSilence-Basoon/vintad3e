import { Button } from '@vintad3e/ui/components';
import Link from 'next/link';
import { fixtureFloorTrend } from './floor-fixture-daily';
import {
  formatCount,
  formatShortBusinessDate,
  formatWon,
} from './floor-format';
import { PERIOD_PRESETS, resolvePeriodRequest } from './floor-period';

export async function FloorRevenueTrend({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const period = resolvePeriodRequest({
    preset: single(params.preset),
    from: single(params.from),
    to: single(params.to),
  });
  let data;
  try {
    data = fixtureFloorTrend(process.env.NODE_ENV, process.env.VINTAD3E_FLOOR_FIXTURE, new Date(),
      period.preset === 'custom'
        ? { from: period.from, to: period.to }
        : { days: period.days },
    );
  } catch {
    return (
      <section className="floor-section floor-section--error" role="alert">
        기간별 F&B 매출을 불러오지 못했습니다.
      </section>
    );
  }
  return (
    <section
      className="dashboard-panel floor-section"
      aria-labelledby="revenue-trend-title"
    >
      <div className="dashboard-panel__header">
        <h2 id="revenue-trend-title">기간별 F&B 매출</h2>
      </div>
      <nav className="floor-chips" aria-label="매출 조회 기간">
        {PERIOD_PRESETS.map((p) => (
          <Link
            key={p.key}
            className={`floor-chip${period.preset === p.key ? ' is-active' : ''}`}
            href={`/?preset=${p.key}`}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <form className="floor-date-range" action="/">
        <label className="floor-date-range__field">
          <span className="sr-only">매출 시작일</span>
          <input
            type="date"
            name="from"
            defaultValue={data.from}
            max={data.latestBusinessDate}
            required
          />
        </label>
        <span>~</span>
        <label className="floor-date-range__field">
          <span className="sr-only">매출 종료일</span>
          <input
            type="date"
            name="to"
            defaultValue={data.to}
            max={data.latestBusinessDate}
            required
          />
        </label>
        <Button variant="primary" size="small" profile="timetable">보기</Button>
      </form>
      <p>
        {formatShortBusinessDate(data.from)} ~{' '}
        {formatShortBusinessDate(data.to)} · F&B {formatWon(data.totals.fnbNet)}{' '}
        · {formatCount(data.totals.fnbOrderCount, '건')}
      </p>
      <div className="floor-table-wrap">
        <table className="simple-table floor-table">
          <caption className="sr-only">날짜별 F&B 매출과 주문 수</caption>
          <thead>
            <tr>
              <th scope="col">영업일</th>
              <th scope="col" className="floor-table__num">
                F&B 매출
              </th>
              <th scope="col" className="floor-table__num">
                주문 수
              </th>
              <th scope="col" className="floor-table__num">
                주문당
              </th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((row) => (
              <tr key={row.businessDate}>
                <th scope="row">
                  <Link href={`/?date=${row.businessDate}`}>
                    {formatShortBusinessDate(row.businessDate)}
                  </Link>
                </th>
                <td className="floor-table__num">{formatWon(row.fnbNet)}</td>
                <td className="floor-table__num">
                  {formatCount(row.fnbOrderCount, '건')}
                </td>
                <td className="floor-table__num">
                  {formatWon(
                    row.fnbOrderCount ? row.fnbNet / row.fnbOrderCount : null,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
