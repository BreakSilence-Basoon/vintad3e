'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react';

export interface PortalCarouselPage {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

const DRAG_THRESHOLD = 6; // px: 이보다 적게 움직이면 클릭으로 본다.
const SWIPE_DISTANCE = 0.18; // 페이지 폭 대비 비율
const SWIPE_VELOCITY = 0.45; // px/ms

export function PortalCarousel({ pages }: { readonly pages: readonly PortalCarouselPage[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; lastX: number; lastT: number; velocity: number; moved: boolean; locked: boolean | null } | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const last = pages.length - 1;

  const go = useCallback((index: number) => setActive(Math.min(Math.max(index, 0), last)), [last]);

  useEffect(() => {
    const onResize = () => setOffset(0);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX,
      lastT: event.timeStamp, velocity: 0, moved: false, locked: null };
    suppressClick.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (state.locked === null) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      state.locked = Math.abs(dx) > Math.abs(dy);
      if (!state.locked) { drag.current = null; return; }
      state.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const dt = Math.max(event.timeStamp - state.lastT, 1);
    state.velocity = (event.clientX - state.lastX) / dt;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;
    const atEdge = (active === 0 && dx > 0) || (active === last && dx < 0);
    setOffset(atEdge ? dx * 0.28 : dx);
  };

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state || state.id !== event.pointerId || !state.moved) return;
    const width = viewport.current?.clientWidth ?? 1;
    const dx = event.clientX - state.startX;
    let next = active;
    if (dx < -width * SWIPE_DISTANCE || state.velocity < -SWIPE_VELOCITY) next = active + 1;
    else if (dx > width * SWIPE_DISTANCE || state.velocity > SWIPE_VELOCITY) next = active - 1;
    suppressClick.current = true;
    setDragging(false);
    setOffset(0);
    go(next);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(active + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(active - 1); }
  };

  return (
    <div className="portal-carousel" role="region" aria-roledescription="캐러셀" aria-label="앱 목록"
      onKeyDown={onKeyDown}>
      <button type="button" className="portal-carousel__arrow" aria-label="이전 페이지" title="이전 페이지"
        aria-disabled={active === 0} onClick={() => go(active - 1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5 8 12l7 7" /></svg>
      </button>

      <div ref={viewport} className="portal-carousel__viewport" data-dragging={dragging || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}
        onClickCapture={onClickCapture} onDragStart={(event) => event.preventDefault()}>
        <div className="portal-carousel__track"
          style={{ transform: `translate3d(calc(${-active * 100}% + ${offset}px), 0, 0)` }}>
          {pages.map((page, index) => (
            <section key={page.id} className="portal-carousel__page" aria-roledescription="슬라이드"
              aria-label={`${index + 1} / ${pages.length} ${page.label}`} aria-hidden={index !== active}
              inert={index !== active ? true : undefined}>
              {page.content}
            </section>
          ))}
        </div>
      </div>

      <button type="button" className="portal-carousel__arrow" aria-label="다음 페이지" title="다음 페이지"
        aria-disabled={active === last} onClick={() => go(active + 1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" /></svg>
      </button>

      <div className="portal-carousel__dots">
        {pages.map((page, index) => (
          <button key={page.id} type="button" className="portal-carousel__dot"
            aria-label={`${page.label} 보기`} aria-current={index === active ? 'true' : undefined}
            onClick={() => go(index)} />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{`${active + 1}번째 페이지, ${pages[active]?.label ?? ''}`}</p>
    </div>
  );
}
