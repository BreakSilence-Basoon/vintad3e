'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type FunnelBucket = {
  label: string;

  days: number;
  visitors: number;
  pageviews: number;
  receiveClicks: number;
  issueSuccess: number;

  purchases: number | null;
};

const number = (value: number) => value.toLocaleString('ko-KR');
const rate = (bucket: FunnelBucket) => bucket.visitors > 0 ? `${(bucket.issueSuccess / bucket.visitors * 100).toFixed(1)}%` : '—';

export function funnelLines(bucket: FunnelBucket): [string, string][] {
  return [
    [bucket.days > 1 ? '방문자(일별 합)' : '방문자', `${number(bucket.visitors)}명`],
    ['페이지 조회', `${number(bucket.pageviews)}회`],
    ['쿠폰 받기 클릭', `${number(bucket.receiveClicks)}회`],
    ['쿠폰 발급 성공', `${number(bucket.issueSuccess)}건`],
    ['쿠폰 구매', bucket.purchases === null ? '—' : `${number(bucket.purchases)}건`],
    ['전환율(발급÷방문자)', rate(bucket)],
  ];
}

export function CouponAnalyticsFunnelChart({ buckets, wide }: { buckets: FunnelBucket[]; wide: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerRef = useRef<{ type: string; wasActive: boolean }>({ type: '', wasActive: false });
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(1, ...buckets.map(bucket => bucket.visitors));
  const purchaseKnown = buckets.some(bucket => bucket.purchases !== null);
  const purchaseMax = Math.max(1, ...buckets.map(bucket => bucket.purchases ?? 0));
  const height = (value: number) => value === 0 ? 0 : Math.max(3, value / max * 100);
  const purchaseY = (value: number) => value / purchaseMax * 88;

  const place = useCallback(() => {
    const frame = frameRef.current, column = active === null ? null : columnRefs.current[active], tip = tipRef.current;
    if (!frame || !column || !tip) return;
    const frameBox = frame.getBoundingClientRect();
    const bar = column.querySelector<HTMLElement>('.coupon-analytics__chart-bar');
    const tops = [...column.querySelectorAll<HTMLElement>('.coupon-analytics__chart-layer, .coupon-analytics__chart-dot')]
      .map(element => element.getBoundingClientRect()).filter(box => box.height > 0).map(box => box.top);
    const columnBox = column.getBoundingClientRect();
    const top = Math.min(bar ? bar.getBoundingClientRect().bottom : columnBox.top, ...tops) - frameBox.top - 6;
    const half = tip.offsetWidth / 2;
    const center = columnBox.left + columnBox.width / 2 - frameBox.left;
    tip.style.left = `${Math.min(Math.max(center, half), Math.max(half, frameBox.width - half))}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = 'visible';
  }, [active]);

  useLayoutEffect(() => { place(); }, [place]);

  useEffect(() => {
    if (active === null) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !frameRef.current?.contains(event.target)) setActive(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActive(null); };
    const scroller = scrollRef.current;
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', place);
    scroller?.addEventListener('scroll', place, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', place);
      scroller?.removeEventListener('scroll', place);
    };
  }, [active, place]);

  const points = buckets.map((bucket, index) => bucket.purchases === null ? null : `${index + 0.5},${100 - purchaseY(bucket.purchases)}`).filter(Boolean).join(' ');

  return (
    <div className="coupon-analytics__chart-frame" ref={frameRef}>
      <div className="coupon-analytics__chart-scroll" ref={scrollRef}>
        <div className="coupon-analytics__preview-chart" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(${wide ? 82 : 32}px, 1fr))` }}>
          {purchaseKnown && <svg className="coupon-analytics__chart-line" viewBox={`0 0 ${buckets.length} 100`} preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline points={points} /></svg>}
          {buckets.map((bucket, index) => (
            <button
              type="button"
              key={bucket.label}
              ref={element => { columnRefs.current[index] = element; }}
              className={`coupon-analytics__chart-column${active === index ? ' is-active' : ''}`}
              aria-label={`${bucket.label} ${funnelLines(bucket).map(([label, value]) => `${label} ${value}`).join(', ')}`}
              aria-pressed={active === index}
              onPointerDown={event => { pointerRef.current = { type: event.pointerType, wasActive: active === index }; }}
              onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(index); }}
              onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(current => current === index && document.activeElement !== event.currentTarget ? null : current); }}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(current => current === index ? null : current)}
              onClick={event => {
                if (pointerRef.current.type === 'mouse' && event.detail > 0) return;
                const wasActive = event.detail > 0 ? pointerRef.current.wasActive : active === index;
                setActive(wasActive ? null : index);
              }}
            >
              <span className="coupon-analytics__chart-bar" aria-hidden="true">
                <i className="coupon-analytics__chart-layer coupon-analytics__chart-layer--visitors" style={{ height: `${height(bucket.visitors)}%` }} />
                <i className="coupon-analytics__chart-layer coupon-analytics__chart-layer--receive" style={{ height: `${height(Math.min(bucket.receiveClicks, bucket.visitors || bucket.receiveClicks))}%` }} />
                <i className="coupon-analytics__chart-layer coupon-analytics__chart-layer--issued" style={{ height: `${height(Math.min(bucket.issueSuccess, bucket.visitors || bucket.issueSuccess))}%` }} />
                {bucket.purchases !== null && <b className="coupon-analytics__chart-dot" style={{ bottom: `${purchaseY(bucket.purchases)}%` }} />}
              </span>
              <span className="coupon-analytics__chart-label" aria-hidden="true">{bucket.label}</span>
            </button>
          ))}
        </div>
      </div>
      {active !== null && buckets[active] && (
        <div className="coupon-analytics__chart-tip" ref={tipRef} aria-hidden="true" style={{ visibility: 'hidden' }}>
          <strong>{buckets[active].label}</strong>
          <dl>{funnelLines(buckets[active]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      )}
    </div>
  );
}
