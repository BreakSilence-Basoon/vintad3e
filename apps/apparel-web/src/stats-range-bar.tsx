'use client';

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { nextRangeForKey } from './stats-range-keyboard';


type Props = {
  availableFrom: string;
  availableTo: string;
  initialFrom: string;
  initialTo: string;
  onChange: (fromIso: string, toIso: string) => void;
  pending?: boolean;
};

const DAY = 86_400_000;

function fmt(ms: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(ms));
}

function diffLabel(fromMs: number, toMs: number) {
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY));
  if (days < 31) return `${days}일`;
  return `약 ${Math.round(days / 30.4)}개월`;
}

const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

export function StatsRangeBar({
  availableFrom,
  availableTo,
  initialFrom,
  initialTo,
  onChange,
  pending,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const trackStart = new Date(availableFrom).getTime();
  const trackEnd = new Date(availableTo).getTime();
  const span = Math.max(DAY, trackEnd - trackStart);
  const toFrac = (iso: string) => clamp01((new Date(iso).getTime() - trackStart) / span);
  const minSel = Math.min(1, (DAY * 7) / span);

  const [sel, setSel] = useState(() => ({ s: toFrac(initialFrom), e: toFrac(initialTo) }));
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ mode: 'start' | 'end' | 'selBody' | null; origin: number; a: number; b: number }>({
    mode: null,
    origin: 0,
    a: 0,
    b: 0,
  });

  const trackFromX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp01((clientX - rect.left) / rect.width);
  }, []);

  const commit = useCallback(
    (s: number, e: number) => {
      const fromMs = Math.round(trackStart + s * span);
      const toMs = Math.round(trackStart + e * span);
      onChange(new Date(fromMs).toISOString(), new Date(toMs).toISOString());
    },
    [onChange, span, trackStart],
  );

  const beginDrag = (mode: 'start' | 'end' | 'selBody') => (ev: ReactPointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setAnimate(false); // 드래그는 즉시 따라오게(트랜지션 끔)
    trackRef.current?.setPointerCapture?.(ev.pointerId);
    drag.current = { mode, origin: trackFromX(ev.clientX), a: sel.s, b: sel.e };
  };

  const onMove = (ev: ReactPointerEvent) => {
    const d = drag.current;
    if (!d.mode) return;
    const t = trackFromX(ev.clientX);
    if (d.mode === 'start') {
      setSel((s) => ({ ...s, s: Math.min(t, s.e - minSel) }));
    } else if (d.mode === 'end') {
      setSel((s) => ({ ...s, e: Math.max(t, s.s + minSel) }));
    } else {
      const delta = t - d.origin;
      const width = d.b - d.a;
      let ns = d.a + delta;
      let ne = d.b + delta;
      if (ns < 0) {
        ns = 0;
        ne = width;
      }
      if (ne > 1) {
        ne = 1;
        ns = 1 - width;
      }
      setSel({ s: ns, e: ne });
    }
  };

  const endDrag = (ev: ReactPointerEvent) => {
    const mode = drag.current.mode;
    if (!mode) return;
    trackRef.current?.releasePointerCapture?.(ev.pointerId);
    drag.current.mode = null;
    commit(sel.s, sel.e);
  };

  const zoom = (factor: number) => {
    setAnimate(true); // 파란 창이 부드럽게 늘었다/줄었다
    const w = sel.e - sel.s;
    const center = (sel.s + sel.e) / 2;
    const nw = Math.min(1, Math.max(minSel, w * factor));
    let ns = clamp01(center - nw / 2);
    ns = Math.max(0, Math.min(ns, 1 - nw));
    const ne = ns + nw;
    setSel({ s: ns, e: ne });
    commit(ns, ne);
  };

  const reset = () => {
    setAnimate(true);
    setSel({ s: 0, e: 1 });
    commit(0, 1);
  };

  const moveHandle = (which: 'start' | 'end') => (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    const selection = nextRangeForKey(sel, minSel, DAY / span, which, event.key);
    if (!selection) return;
    event.preventDefault();
    if (selection.s === sel.s && selection.e === sel.e) return;
    setAnimate(false);
    setSel(selection);
    commit(selection.s, selection.e);
  };

  const selFrom = trackStart + sel.s * span;
  const selTo = trackStart + sel.e * span;
  const left = clamp01(sel.s) * 100;
  const width = Math.max(0, (clamp01(sel.e) - clamp01(sel.s)) * 100);
  const w = sel.e - sel.s;
  const atMaxZoom = w <= minSel + 1e-4;
  const atFull = w >= 1 - 1e-4;

  return (
    <div style={wrap}>
      <div style={topRow}>
        <div>
          <strong style={rangeText}>
            {fmt(selFrom)} ~ {fmt(selTo)}
          </strong>{' '}
          <span style={subText}>({diffLabel(selFrom, selTo)})</span>
          {pending ? <span style={subText}> · 불러오는 중…</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            style={atMaxZoom ? { ...btn, ...btnOff } : btn}
            onClick={() => zoom(0.5)}
            disabled={atMaxZoom}
            title="확대 — 짧은 기간(최대 일별)"
          >
            +
          </button>
          <button
            type="button"
            style={atFull ? { ...btn, ...btnOff } : btn}
            onClick={() => zoom(2)}
            disabled={atFull}
            title="축소 — 넓은 기간"
          >
            −
          </button>
          <button
            type="button"
            style={atFull ? { ...btnWide, ...btnOff } : btnWide}
            onClick={reset}
            disabled={atFull}
            title="전체 기간으로"
          >
            전체
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        style={track}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          style={{
            ...windowPill,
            left: `${left}%`,
            width: `${width}%`,
            transition: animate ? 'left 0.28s ease, width 0.28s ease' : 'none',
          }}
          onPointerDown={beginDrag('selBody')}
        >
          <span className="stats-range-handle" style={{ ...handle, left: -7 }} role="slider" tabIndex={0} aria-label="시작일" aria-valuemin={trackStart} aria-valuemax={Math.round(trackStart + Math.max(0, sel.e - minSel) * span)} aria-valuenow={Math.round(selFrom)} aria-valuetext={fmt(selFrom)} onKeyDown={moveHandle('start')} onPointerDown={beginDrag('start')}>
            <span style={grip} aria-hidden="true" />
          </span>
          <span className="stats-range-handle" style={{ ...handle, right: -7 }} role="slider" tabIndex={0} aria-label="종료일" aria-valuemin={Math.round(trackStart + Math.min(1, sel.s + minSel) * span)} aria-valuemax={Math.round(trackStart + span)} aria-valuenow={Math.round(selTo)} aria-valuetext={fmt(selTo)} onKeyDown={moveHandle('end')} onPointerDown={beginDrag('end')}>
            <span style={grip} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div style={ticks}>
        <span>{fmt(trackStart)}</span>
        <span>{fmt(trackEnd)}</span>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { display: 'grid', gap: 8 };
const topRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};
const rangeText: CSSProperties = { fontSize: '0.95rem' };
const subText: CSSProperties = { fontSize: '0.82rem', color: 'var(--muted)' };
const btn: CSSProperties = {
  minWidth: 32,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.14)',
  background: 'var(--surface, #fff)',
  color: 'var(--muted)',
  fontSize: '1.05rem',
  lineHeight: 1,
  cursor: 'pointer',
};
const btnWide: CSSProperties = { ...btn, minWidth: 48, fontSize: '0.85rem' };
const btnOff: CSSProperties = { opacity: 0.35, cursor: 'not-allowed' };
const track: CSSProperties = {
  position: 'relative',
  height: 46,
  borderRadius: 10,
  overflow: 'hidden',
  background:
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 64px), rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.10)',
  touchAction: 'none',
  userSelect: 'none',
};
const windowPill: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  background: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  border: '1.5px solid var(--accent)',
  borderRadius: 10,
  cursor: 'grab',
  touchAction: 'none',
};
const handle: CSSProperties = {
  position: 'absolute',
  top: -1,
  bottom: -1,
  width: 14,
  background: 'var(--accent)',
  borderRadius: 6,
  cursor: 'ew-resize',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'none',
  zIndex: 2,
};
const grip: CSSProperties = {
  width: 2,
  height: 16,
  background: 'rgba(255,255,255,0.85)',
  borderRadius: 2,
  boxShadow: '3px 0 0 rgba(255,255,255,0.85), -3px 0 0 rgba(255,255,255,0.85)',
};
const ticks: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  fontSize: '0.74rem',
  color: 'var(--muted)',
};
