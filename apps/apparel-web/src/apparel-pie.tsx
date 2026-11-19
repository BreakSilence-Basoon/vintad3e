'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { svgFillSlots } from '@vintad3e/ui/slots';
import type { SalesOverviewData } from './sales-overview-types';
const GRAPHIC_IMAGE_BY_PRODUCT_CODE: Record<string, string> = {};

const PALETTE = [
  '#2b4a40', '#b0842c', '#7a5c3e', '#5b7f6f', '#a8743f', '#caa15a',
  '#46685c', '#8d5b14', '#9c6b4a', '#6f8b7d', '#bd9a4e', '#88553a',
  '#3f6b5a', '#c0894a', '#6b6048', '#a86f52',
];

type Metric = 'revenue' | 'units';
type Tab = 'all' | 'online' | 'offline';

const won = (value: number) => `₩${Math.round(value).toLocaleString('ko-KR')}`;
const num = (value: number) => value.toLocaleString('ko-KR');

function pctStr(part: number, whole: number) {
  if (whole <= 0) return '—';
  return `${((part / whole) * 100).toFixed(2)}%`;
}

const VBW = 1060;
const VBH = 660;
const CX = 530;
const CY = 300;
const R = 150;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedge(start: number, end: number) {
  const e = end - start >= 360 ? start + 359.999 : end;
  const large = e - start > 180 ? 1 : 0;
  const p1 = polar(CX, CY, R, start);
  const p2 = polar(CX, CY, R, e);
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'online', label: '온라인' },
  { key: 'offline', label: '오프라인' },
];

type DesignRow = SalesOverviewData['onlineApparelByDesign'][number];
type OptionRow = DesignRow['options'][number];
type OtherRow = SalesOverviewData['onlineApparelOther'];

function mergeDesigns(a: DesignRow[], b: DesignRow[]): DesignRow[] {
  const map = new Map<string, DesignRow & { _opt: Map<string, OptionRow> }>();
  for (const d of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const key = d.productCode ?? `name:${d.designName}`;
    let row = map.get(key);
    if (!row) {
      row = { productCode: d.productCode, designName: d.designName, units: 0, revenue: 0, options: [], revenueUnavailable: true, _opt: new Map() };
      map.set(key, row);
    }
    row.units += d.units;
    row.revenue += d.revenue;
    row.unconvertedRevenue = row.unconvertedRevenue || d.unconvertedRevenue;
    row.revenueUnavailable = row.revenueUnavailable && Boolean(d.revenueUnavailable);
    for (const o of d.options) {
      const ok = o.skuCode ?? `label:${o.label}`;
      const ex = row._opt.get(ok);
      if (ex) {
        ex.units += o.units;
        ex.revenue += o.revenue;
        ex.unconvertedRevenue = ex.unconvertedRevenue || o.unconvertedRevenue;
        ex.revenueUnavailable = Boolean(ex.revenueUnavailable && o.revenueUnavailable);
      } else {
        row._opt.set(ok, { ...o });
      }
    }
  }
  return [...map.values()]
    .map(({ _opt, ...r }) => ({ ...r, options: [..._opt.values()].sort((x, y) => y.revenue - x.revenue) }))
    .sort((x, y) => y.revenue - x.revenue);
}

function mergeOther(a: OtherRow, b: OtherRow): OtherRow {
  if (!a && !b) return null;
  return {
    distinctCount: (a?.distinctCount ?? 0) + (b?.distinctCount ?? 0),
    units: (a?.units ?? 0) + (b?.units ?? 0),
    revenue: (a?.revenue ?? 0) + (b?.revenue ?? 0),
    unconvertedRevenue: Boolean(a?.unconvertedRevenue || b?.unconvertedRevenue),
    revenueUnavailable: Boolean((!a || a.revenueUnavailable) && (!b || b.revenueUnavailable)),
  };
}

type Props = {
  hasUnconvertedOnlineRevenue?: boolean;
  onlineDesigns: DesignRow[];
  onlineOther: OtherRow;
  storeDesigns: DesignRow[];
  storeOther: OtherRow;
};

export function ApparelPie({ onlineDesigns, onlineOther, storeDesigns, storeOther, hasUnconvertedOnlineRevenue = false }: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const [metric, setMetric] = useState<Metric>('revenue');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { designs, other } = useMemo(() => {
    const on = Array.isArray(onlineDesigns) ? onlineDesigns : [];
    const st = Array.isArray(storeDesigns) ? storeDesigns : [];
    if (tab === 'online') return { designs: on, other: onlineOther ?? null };
    if (tab === 'offline') return { designs: st, other: storeOther ?? null };
    return { designs: mergeDesigns(on, st), other: mergeOther(onlineOther ?? null, storeOther ?? null) };
  }, [tab, onlineDesigns, onlineOther, storeDesigns, storeOther]);

  const metricOf = (units: number, revenue: number) => (metric === 'revenue' ? revenue : units);
  const fmt = (value: number) => (metric === 'revenue' ? won(value) : `${num(value)}장`);

  const segments = useMemo(() => {
    return designs
      .map((d) => ({
        id: d.productCode ?? d.designName,
        label: d.designName,
        value: metricOf(d.units, d.revenue),
        unconvertedRevenue: d.unconvertedRevenue,
        imageSrc: d.productCode ? GRAPHIC_IMAGE_BY_PRODUCT_CODE[d.productCode] : undefined,
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));
  }, [designs, metric]);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const external = other ? metricOf(other.units, other.revenue) : 0;
  const grand = total + external;

  const arcs = useMemo(() => {
    const RXL = R + 184; // 라벨 타원 가로 반경
    const RYL = R + 104; // 세로 반경
    const N = segments.length;
    let acc = 0;
    const base = segments.map((seg) => {
      const sweep = total > 0 ? (seg.value / total) * 360 : 0;
      const start = acc;
      acc += sweep;
      const mid = (start + acc) / 2; // 0..360, 12시에서 시계방향
      return { seg, d: wedge(start, acc), mid };
    });
    const labelAngle = new Map<string, number>();
    if (N > 0) {
      const ang = base.map((b) => b.mid);
      let cut = 0;
      let maxGap = -1;
      for (let i = 0; i < N; i += 1) {
        const gap = (ang[(i + 1) % N] - ang[i] + 360) % 360;
        if (gap > maxGap) {
          maxGap = gap;
          cut = (i + 1) % N;
        }
      }
      const order: number[] = [];
      for (let k = 0; k < N; k += 1) order.push((cut + k) % N);
      const du: number[] = [];
      for (let k = 0; k < N; k += 1) {
        let v = ang[order[k]];
        if (k > 0) while (v < du[k - 1]) v += 360;
        du.push(v);
      }
      const g = Math.min(360 / N - 0.5, 21); // 최소 각도 간격
      const pos: number[] = [];
      for (let k = 0; k < N; k += 1) pos[k] = k === 0 ? du[0] : Math.max(du[k], pos[k - 1] + g);
      const limit = du[0] + 360 - g;
      if (pos[N - 1] > limit) {
        pos[N - 1] = limit;
        for (let k = N - 2; k >= 0; k -= 1) pos[k] = Math.min(pos[k], pos[k + 1] - g);
      }
      order.forEach((idx, k) => labelAngle.set(base[idx].seg.id, ((pos[k] % 360) + 360) % 360));
    }
    return base.map((b) => {
      const a = labelAngle.get(b.seg.id) ?? b.mid;
      const rad = ((a - 90) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const lx = CX + cos * RXL;
      const ly = CY + Math.sin(rad) * RYL;
      const anchor: 'start' | 'middle' | 'end' = cos > 0.12 ? 'start' : cos < -0.12 ? 'end' : 'middle';
      return { ...b, eo: polar(CX, CY, R + 4, b.mid), lx, ly, anchor };
    });
  }, [segments, total]);

  const hoveredDesign = hoveredId
    ? designs.find((d) => (d.productCode ?? d.designName) === hoveredId) ?? null
    : null;
  const skuSegments = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of hoveredDesign?.options ?? []) {
      m.set(o.label, (m.get(o.label) ?? 0) + metricOf(o.units, o.revenue));
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [hoveredDesign, metric]);
  const skuTotal = skuSegments.reduce((sum, s) => sum + s.value, 0);

  const hasData = segments.length > 0;
  const labelOrder = hoveredId
    ? [...arcs.filter((a) => a.seg.id !== hoveredId), ...arcs.filter((a) => a.seg.id === hoveredId)]
    : arcs;
  const hoveredArc = hoveredId ? arcs.find((a) => a.seg.id === hoveredId) ?? null : null;

  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
      {/* (좌) 탭 + 금액/수량 · (우) 자체제작 vs 외부 비중 */}
      <div style={controlRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="graphic-tabs" role="tablist" aria-label="의류 매출 범위">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? 'is-active' : undefined}
                onClick={() => {
                  setTab(t.key);
                  setHoveredId(null);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="graphic-tabs" role="tablist" aria-label="지표">
            {(['revenue', 'units'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={metric === m}
                className={metric === m ? 'is-active' : undefined}
                onClick={() => setMetric(m)}
              >
                {m === 'revenue' ? '금액' : '수량'}
              </button>
            ))}
          </div>
        </div>
        {hasData ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={ratioTile}>
              <strong style={ratioValue}>{pctStr(total, grand)}</strong>
              <span style={ratioMeta}>자체제작 · {fmt(total)}</span>
            </div>
            <div style={ratioTile}>
              <strong style={ratioValue}>{pctStr(external, grand)}</strong>
              <span style={ratioMeta}>빈티지·외부 · {metric === 'revenue' && other?.revenueUnavailable ? '환율 확인 필요' : fmt(external)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {hasData && metric === 'revenue' && designs.some((design) => design.revenueUnavailable) ? (
        <p className="console-empty">{designs.filter((design) => design.revenueUnavailable).map((design) => design.designName).join(', ')} · 환율 확인 필요</p>
      ) : null}

      {!hasData ? (
        <p className="console-empty">{metric === 'revenue' && tab !== 'offline' && hasUnconvertedOnlineRevenue ? '환율 확인 필요' : '선택한 범위의 의류 판매 데이터가 없습니다.'}</p>
      ) : (
        <>
          {/* 파이 + 바깥 리더라인 라벨 (호버 시 그 라벨 자리에 SKU 펼침) */}
          <svg
            viewBox={`0 0 ${VBW} ${VBH}`}
            width="100%"
            style={{ display: 'block', height: 'auto' }}
            role="img"
            aria-label="그래픽별 매출 파이 (조각에 마우스를 올리면 SKU별로 펼쳐 보임)"
          >
            <defs>
              {arcs.map(({ seg, d }) => (
                <clipPath key={seg.id} id={`wedge-${seg.id}`}>
                  <path d={d} />
                </clipPath>
              ))}
              <clipPath id="pieFullClip">
                <circle cx={CX} cy={CY} r={R} />
              </clipPath>
            </defs>

            {/* 조각 */}
            <g style={{ pointerEvents: 'none' }}>
              {arcs.map(({ seg, d }) => {
                const isHovered = hoveredId === seg.id;
                const dim = hoveredId !== null && !isHovered;
                return (
                  <g key={seg.id} opacity={dim ? 0.4 : 1} style={{ transition: 'opacity 0.15s ease' }}>
                    {seg.imageSrc ? (
                      <>
                        <image
                          href={seg.imageSrc}
                          x={CX - R}
                          y={CY - R}
                          width={R * 2}
                          height={R * 2}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#wedge-${seg.id})`}
                        />
                        <path d={d} fill={`rgba(20,15,8,${isHovered ? 0.06 : 0.2})`} />
                      </>
                    ) : (
                      <path d={d} fill={seg.color} />
                    )}
                    <path d={d} fill="none" stroke="var(--surface-strong, #fff)" strokeWidth={2.5} />
                  </g>
                );
              })}
            </g>

            {/* 호버: 선택 그래픽을 파이 전체에 + 선택 조각만 선명, 나머지는 흐릿 */}
            {hoveredArc?.seg.imageSrc ? (
              <g style={{ pointerEvents: 'none' }}>
                <image
                  href={hoveredArc.seg.imageSrc}
                  x={CX - R}
                  y={CY - R}
                  width={R * 2}
                  height={R * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#pieFullClip)"
                />
                {arcs.map((a) =>
                  a.seg.id === hoveredArc.seg.id ? null : (
                    <path key={`hov-dim-${a.seg.id}`} d={a.d} fill={svgFillSlots.apparelPieHoverDim} />
                  ),
                )}
                {arcs.map((a) => (
                  <path
                    key={`hov-ln-${a.seg.id}`}
                    d={a.d}
                    fill="none"
                    stroke="var(--surface-strong, #fff)"
                    strokeWidth={2}
                  />
                ))}
                <path d={hoveredArc.d} fill="none" stroke="var(--accent)" strokeWidth={3} />
              </g>
            ) : null}

            {/* 리더라인 + 둘레 라벨 (조각/카드 어느 쪽에 호버해도 SKU 펼침; 호버된 건 맨 위).
                호버 카드는 HTML(foreignObject)로 — 세부 항목이 라벨 왼쪽/% 오른쪽 칼럼으로 정렬되고
                헤더(그래픽·금액)와 세부 항목 사이에 구분선+간격이 들어간다. */}
            {labelOrder.map(({ seg, eo, lx, ly, anchor }) => {
              const isHovered = hoveredId === seg.id;
              const dim = hoveredId !== null && !isHovered;
              const sku = isHovered ? skuSegments.slice(0, 6) : [];
              const FOW = 244; // 카드 영역 폭(카드는 내용에 맞춰 그 안에서 줄어듦)
              const estH = 50 + (sku.length ? 13 + sku.length * 18 : 0);
              const blockTop = ly - 16;
              const vshift = Math.max(0, blockTop + estH - (VBH - 8));
              const top = blockTop - vshift;
              const nameY = top + 14;
              const tx = anchor === 'start' ? lx + 8 : anchor === 'end' ? lx - 8 : lx;
              const foX = anchor === 'start' ? lx : anchor === 'end' ? lx - FOW : lx - FOW / 2;
              const justify = anchor === 'start' ? 'flex-start' : anchor === 'end' ? 'flex-end' : 'center';
              const hitW = isHovered ? FOW : 176;
              const hitX = anchor === 'start' ? lx : anchor === 'end' ? lx - hitW : lx - hitW / 2;
              return (
                <g
                  key={`lbl-${seg.id}`}
                  opacity={dim ? 0.35 : 1}
                  style={{ transition: 'opacity 0.15s ease' }}
                >
                  <line
                    x1={eo.x}
                    y1={eo.y}
                    x2={lx}
                    y2={ly}
                    stroke={isHovered ? 'var(--accent)' : 'rgba(0,0,0,0.28)'}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  <circle cx={eo.x} cy={eo.y} r={isHovered ? 3.5 : 2.5} fill={isHovered ? 'var(--accent)' : 'rgba(0,0,0,0.4)'} />
                  {isHovered ? (
                    <foreignObject
                      x={foX}
                      y={top - 6}
                      width={FOW}
                      height={estH + 48}
                      style={{ overflow: 'visible', pointerEvents: 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: justify, width: '100%' }}>
                        <div style={cardBoxStyle}>
                          <div style={cardName}>{seg.label}</div>
                          <div style={cardAmount}>
                            {fmt(seg.value)} · {pctStr(seg.value, total)}{metric === 'revenue' && seg.unconvertedRevenue ? ' · 미환산 제외' : ''}
                          </div>
                          {sku.length ? <div style={cardDivider} /> : null}
                          {sku.map((s) => (
                            <div key={s.label} style={cardRow}>
                              <span>· {s.label}</span>
                              <span style={cardPct}>{pctStr(s.value, skuTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </foreignObject>
                  ) : (
                    <text x={tx} y={nameY} textAnchor={anchor}>
                      <tspan x={tx} dy={0} style={{ fontSize: 14, fontWeight: 700, fill: 'var(--ink, #1c1a16)' }}>
                        {seg.label}
                      </tspan>
                      <tspan x={tx} dy="1.25em" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--muted)' }}>
                        {fmt(seg.value)} · {pctStr(seg.value, total)}{metric === 'revenue' && seg.unconvertedRevenue ? ' · 미환산 제외' : ''}
                      </tspan>
                    </text>
                  )}
                  {/* 투명 히트 영역(맨 위) — 카드/조각 어디 호버해도 동일 동작 */}
                  <rect
                    x={hitX - 2}
                    y={top - 8}
                    width={hitW + 4}
                    height={isHovered ? estH + 30 : 46}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(seg.id)}
                    onMouseLeave={() => setHoveredId((cur) => (cur === seg.id ? null : cur))}
                  />
                </g>
              );
            })}

            {/* 히트 레이어 */}
            <g>
              {arcs.map(({ seg, d }) => (
                <path
                  key={`hit-${seg.id}`}
                  d={d}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  aria-label={`${seg.label} ${fmt(seg.value)} ${pctStr(seg.value, total)}`}
                  onMouseEnter={() => setHoveredId(seg.id)}
                  onMouseLeave={() => setHoveredId((cur) => (cur === seg.id ? null : cur))}
                />
              ))}
            </g>
          </svg>
        </>
      )}
    </div>
  );
}

const controlRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};
const ratioTile: CSSProperties = {
  display: 'grid',
  gap: 1,
  padding: '6px 12px',
  borderRadius: 9,
  background: 'rgba(0,0,0,0.04)',
  minWidth: 128,
};
const ratioValue: CSSProperties = { fontSize: '1.12rem', lineHeight: 1.15 };
const ratioMeta: CSSProperties = { fontSize: '0.76rem', color: 'var(--muted)' };

const cardBoxStyle: CSSProperties = {
  display: 'inline-block',
  background: 'var(--surface-strong, #fffdf8)',
  border: '1px solid var(--accent)',
  borderRadius: 9,
  padding: '8px 11px',
  boxShadow: '0 3px 10px rgba(20, 15, 8, 0.22)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};
const cardName: CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--ink, #1c1a16)', lineHeight: 1.2 };
const cardAmount: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--muted)',
  lineHeight: 1.3,
  marginTop: 1,
  fontVariantNumeric: 'tabular-nums',
};
const cardDivider: CSSProperties = { height: 1, background: 'rgba(0, 0, 0, 0.12)', margin: '6px 0' };
const cardRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  fontSize: 11,
  lineHeight: 1.6,
  color: 'var(--ink, #2a2620)',
};
const cardPct: CSSProperties = { fontVariantNumeric: 'tabular-nums', color: 'var(--muted)', paddingLeft: 12 };
