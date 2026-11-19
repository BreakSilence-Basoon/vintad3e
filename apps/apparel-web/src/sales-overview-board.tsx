'use client';

import { useCallback, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { svgFillSlots } from '@vintad3e/ui/slots';
import type {
  SalesGrain,
  SalesOverviewData,
  SalesOverviewSeriesRow,
} from './sales-overview-types';
import { ApparelPie } from './apparel-pie';
import { StatsRangeBar } from './stats-range-bar';
const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;


const won = (value: number) => `₩${Math.round(value).toLocaleString('ko-KR')}`;
const pct = (part: number, whole: number) => {
  if (whole <= 0) return '—';
  return `${((part / whole) * 100).toFixed(2)}%`;
};

const STORE_COLOR = 'var(--accent)';
const ONLINE_COLOR = '#b0842c';

const kpiGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  alignItems: 'stretch',
};
const kpiCard: CSSProperties = {
  minWidth: 0,
  minHeight: 80,
  padding: '12px 16px',
  borderRadius: 16,
  border: '1px solid rgba(54, 44, 32, 0.08)',
  background: 'rgba(255, 253, 248, 0.72)',
  boxShadow: 'var(--shadow-soft)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 6,
};
const kpiValue: CSSProperties = {
  fontSize: '1.18rem',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};
const kpiLabel: CSSProperties = { color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.25 };

const GRAIN_LABEL: Record<SalesGrain, string> = {
  month: '월별',
  week: '주별',
  day: '일별',
  hour: '시간대별',
};

function ChartLegend() {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      {[
        { c: STORE_COLOR, label: '매장 (Toss)' },
        { c: ONLINE_COLOR, label: '온라인 (Cafe24)' },
      ].map((x) => (
        <span
          key={x.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.82rem',
            color: 'var(--muted)',
          }}
        >
          <span
            style={{ width: 11, height: 11, borderRadius: 3, background: x.c, display: 'inline-block' }}
          />
          {x.label}
        </span>
      ))}
    </div>
  );
}

const CHART_W = 780;
const CHART_H = 210;
const TOP_PAD = 12;
const BOTTOM_PAD = 28;
const PLOT_H = CHART_H - TOP_PAD - BOTTOM_PAD;

function SeriesChart({
  series,
  grain,
  onlineRevenueUnavailable = false,
}: {
  series: SalesOverviewSeriesRow[];
  grain: SalesGrain;
  onlineRevenueUnavailable?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!series || series.length === 0) {
    return <p className="console-empty">표시할 데이터가 없습니다.</p>;
  }
  const n = series.length;
  const max = Math.max(1, ...series.map((s) => Math.max(s.storeRevenue, s.onlineRevenue)));
  const scale = (v: number) => (v / max) * PLOT_H;
  const slot = CHART_W / n;
  const sideGap = Math.min(slot * 0.18, 7);
  const pairGap = Math.min(slot * 0.08, 3);
  const barW = Math.max(1, (slot - sideGap * 2 - pairGap) / 2);
  const labelStep = Math.max(1, Math.ceil(n / 13));
  const baseY = TOP_PAD + PLOT_H;
  const active = hoverIdx != null && hoverIdx >= 0 && hoverIdx < n ? series[hoverIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width="100%"
      style={{ height: 'auto', display: 'block' }}
      role="img"
      aria-label={`${GRAIN_LABEL[grain]} 매출 막대그래프`}
    >
      <line x1={0} y1={baseY} x2={CHART_W} y2={baseY} stroke="var(--border)" strokeWidth={1} />
      {series.map((s, i) => {
        const center = i * slot + slot / 2;
        const storeH = scale(s.storeRevenue);
        const onlineH = scale(s.onlineRevenue);
        const showLabel = i % labelStep === 0 || i === n - 1;
        const faded = hoverIdx !== null && hoverIdx !== i;
        return (
          <g key={s.bucket} opacity={faded ? 0.45 : 1} style={{ transition: 'opacity 0.12s ease' }}>
            {hoverIdx === i ? (
              <rect x={i * slot} y={TOP_PAD - 4} width={slot} height={PLOT_H + 4} rx={4} fill={svgFillSlots.apparelSalesHoverBackground} />
            ) : null}
            <rect
              x={center - pairGap / 2 - barW}
              y={baseY - storeH}
              width={barW}
              height={storeH}
              fill={STORE_COLOR}
              rx={Math.min(3, barW / 2)}
              style={{ transition: 'y 0.35s ease, height 0.35s ease' }}
            />
            <rect
              x={center + pairGap / 2}
              y={baseY - onlineH}
              width={barW}
              height={onlineH}
              fill={ONLINE_COLOR}
              rx={Math.min(3, barW / 2)}
              style={{ transition: 'y 0.35s ease, height 0.35s ease' }}
            />
            {showLabel ? (
              <text
                x={center}
                y={CHART_H - 9}
                fontSize={10}
                fill="var(--muted)"
                textAnchor="middle"
              >
                {s.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* 호버 레이어 — 막대가 얇아도 칼럼 전체를 잡아 수치 툴팁을 띄운다. */}
      {series.map((s, i) => (
        <rect
          key={`hit-${s.bucket}`}
          x={i * slot}
          y={TOP_PAD - 4}
          width={slot}
          height={PLOT_H + 8}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoverIdx(i)}
          onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
        />
      ))}

      {/* 수치 툴팁 (즉시 표시) */}
      {active
        ? (() => {
            const center = (hoverIdx as number) * slot + slot / 2;
            const boxW = 162;
            const boxH = 52;
            const tipX = Math.max(2, Math.min(CHART_W - boxW - 2, center - boxW / 2));
            const topBar = baseY - Math.max(scale(active.storeRevenue), scale(active.onlineRevenue));
            const tipY = Math.max(2, topBar - boxH - 6);
            return (
              <g pointerEvents="none">
                <rect
                  x={tipX}
                  y={tipY}
                  width={boxW}
                  height={boxH}
                  rx={7}
                  fill="var(--surface-strong, #fffdf8)"
                  stroke="var(--accent)"
                  strokeWidth={1}
                />
                <text x={tipX + 11} y={tipY + 16} fontSize={11} fontWeight={700} fill="var(--ink, #1c1a16)">
                  {active.label}
                </text>
                <text x={tipX + 11} y={tipY + 32} fontSize={10.5} fill={STORE_COLOR}>
                  매장 {won(active.storeRevenue)}
                </text>
                <text x={tipX + 11} y={tipY + 46} fontSize={10.5} fill={ONLINE_COLOR}>
                  온라인 {active.onlineRevenueUnavailable || onlineRevenueUnavailable ? '환율 확인 필요' : won(active.onlineRevenue)}
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}

export function SalesOverviewBoard({ initial }: { initial: SalesOverviewData }) {
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  const [data, setData] = useState<SalesOverviewData>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const track = useRef({ from: initial.availableFrom, to: initial.availableTo });
  const reqId = useRef(0);

  const onRangeChange = useCallback(async (fromIso: string, toIso: string) => {
    const id = ++reqId.current;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/admin/stats/sales-overview?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as SalesOverviewData;
      if (id !== reqId.current) return; // 더 최신 요청이 있으면 버림
      setData(json);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      if (id === reqId.current) setPending(false);
    }
  }, []);

  const t = data.totals;
  const dim = { opacity: pending ? 0.5 : 1, transition: 'opacity 0.25s ease' };

  return (
    <>
      <section className="console-section" data-hydrated={hydrated}>
        <StatsRangeBar
          availableFrom={track.current.from}
          availableTo={track.current.to}
          initialFrom={data.rangeFrom}
          initialTo={data.rangeTo}
          onChange={onRangeChange}
          pending={pending}
        />
        {error ? (
          <p className="console-empty" style={{ marginTop: 8 }}>
            구간 조회 실패 · {error}
          </p>
        ) : null}
      </section>

      {/* KPI 카드 — 내용 길이와 무관하게 고정 크기(동일 폭·높이) 그리드. */}
      <section style={{ ...dim, ...kpiGrid }}>
        {[
          { v: won(t.storeRevenue), l: '매장 매출 (Toss)' },
          { v: won(t.storeApparelRevenue), l: `매장 의류 · 매장의 ${pct(t.storeApparelRevenue, t.storeRevenue)}` },
          { v: won(t.storeFnbRevenue), l: `매장 F&B · 매장의 ${pct(t.storeFnbRevenue, t.storeRevenue)}` },
          { v: data.onlineRevenueUnavailable ? '환율 확인 필요' : won(t.onlineRevenue), l: '온라인 매출 (Cafe24)' },
        ].map((k) => (
          <div key={k.l} style={kpiCard}>
            <strong style={kpiValue}>{k.v}</strong>
            <span style={kpiLabel}>{k.l}</span>
          </div>
        ))}
      </section>

      <section className="console-section">
        <div className="console-section__header">
          <ChartLegend />
        </div>
        {(data.unconvertedCurrencyTotals ?? []).map((row) => (
          <p key={row.currencyCode} className="console-empty">
            {row.amount === null ? '금액 확인 필요' : `${new Intl.NumberFormat('ko-KR').format(row.amount)} ${row.currencyCode}`}
            {' · '}{row.saleCount}건{' · 원화 합계 제외'}
          </p>
        ))}
        <div style={dim}>
          <SeriesChart series={data.series} grain={data.grain} onlineRevenueUnavailable={data.onlineRevenueUnavailable} />
        </div>
      </section>

      <section className="console-section" style={dim}>
        <ApparelPie
          onlineDesigns={data.onlineApparelByDesign}
          onlineOther={data.onlineApparelOther}
          storeDesigns={data.storeApparelByDesign}
          storeOther={data.storeApparelOther}
          hasUnconvertedOnlineRevenue={(data.unconvertedCurrencyTotals ?? []).length > 0}
        />
      </section>
    </>
  );
}
