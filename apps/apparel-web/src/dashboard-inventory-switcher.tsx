'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

type InventorySlideKey = 'shortage' | 'tracking';

type DashboardInventorySwitcherProps = {
  shortagePanel: ReactNode;
  trackingPanel: ReactNode;
};

const SLIDE_LABELS: Record<InventorySlideKey, string> = {
  shortage: '매장 디자인별 부족 수량',
  tracking: '목표재고 추적표',
};

const SLIDE_ORDER: InventorySlideKey[] = ['shortage', 'tracking'];

type DragState = {
  active: boolean;
  startX: number;
  lastX: number;
};

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(
        target.closest(
          'button, a, input, textarea, select, label, [contenteditable="true"]',
        ),
      )
    : false;
}

export function DashboardInventorySwitcher({
  shortagePanel,
  trackingPanel,
}: DashboardInventorySwitcherProps) {
  const [activeSlide, setActiveSlide] = useState<InventorySlideKey>('shortage');
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const shortagePanelRef = useRef<HTMLElement | null>(null);
  const trackingPanelRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef<InventorySlideKey>(activeSlide);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef<DragState>({
    active: false,
    startX: 0,
    lastX: 0,
  });

  const activeSlideIndex = SLIDE_ORDER.indexOf(activeSlide);
  const canGoPrevious = activeSlide === 'tracking';
  const canGoNext = activeSlide === 'shortage';
  const stageStyle = {
    '--active-slide-index': String(activeSlideIndex),
    '--drag-offset': `${dragOffset}px`,
    '--slide-translate': `${activeSlideIndex * -100}%`,
    ...(activeHeight === null
      ? {}
      : { '--active-panel-height': `${activeHeight}px` }),
  } as CSSProperties;

  useLayoutEffect(() => {
    const activePanel =
      activeSlide === 'shortage'
        ? shortagePanelRef.current
        : trackingPanelRef.current;

    if (!activePanel) {
      return;
    }

    function measureActivePanel() {
      if (!activePanel) {
        return;
      }

      setActiveHeight(Math.ceil(activePanel.getBoundingClientRect().height));
    }

    measureActivePanel();

    const resizeObserver = new ResizeObserver(measureActivePanel);
    resizeObserver.observe(activePanel);

    const frameId = window.requestAnimationFrame(measureActivePanel);

    window.addEventListener('resize', measureActivePanel);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measureActivePanel);
    };
  }, [activeSlide]);

  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  function showSlide(nextSlide: InventorySlideKey) {
    if (nextSlide === activeSlide) {
      return;
    }

    setDragOffset(0);
    setIsDragging(false);
    isDraggingRef.current = false;
    setActiveSlide(nextSlide);
  }

  const resetDrag = useCallback(() => {
    dragStateRef.current = {
      active: false,
      startX: 0,
      lastX: 0,
    };
    setDragOffset(0);
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  const getBoundedDragOffset = useCallback((rawDeltaX: number) => {
    const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 1;
    const maxOffset = Math.max(stageWidth * 0.42, 1);
    const canMoveToNext = activeSlideRef.current === 'shortage';
    const canMoveToPrevious = activeSlideRef.current === 'tracking';
    const directionalDelta =
      (rawDeltaX < 0 && canMoveToNext) || (rawDeltaX > 0 && canMoveToPrevious)
        ? rawDeltaX
        : rawDeltaX * 0.22;

    return Math.max(Math.min(directionalDelta, maxOffset), -maxOffset);
  }, []);

  const finishDragByDelta = useCallback((deltaX: number) => {
    const dragState = dragStateRef.current;

    if (!dragState.active) {
      return;
    }

    const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 1;
    const threshold = Math.min(150, Math.max(72, stageWidth * 0.16));
    const shouldGoNext =
      deltaX < -threshold && activeSlideRef.current === 'shortage';
    const shouldGoPrevious =
      deltaX > threshold && activeSlideRef.current === 'tracking';
    const shouldSuppressClick = isDraggingRef.current;

    resetDrag();
    suppressClickRef.current = shouldSuppressClick;

    if (shouldGoNext) {
      setActiveSlide('tracking');
      return;
    }

    if (shouldGoPrevious) {
      setActiveSlide('shortage');
    }
  }, [resetDrag]);

  const handleStageMouseDown = useCallback((event: ReactMouseEvent) => {
    if (
      event.button !== 0 ||
      isInteractiveDragTarget(event.target) ||
      !stageRef.current
    ) {
      return;
    }

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      lastX: event.clientX,
    };

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState.active) {
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      dragState.lastX = moveEvent.clientX;

      if (!isDraggingRef.current && Math.abs(deltaX) < 8) {
        return;
      }

      moveEvent.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      setDragOffset(getBoundedDragOffset(deltaX));
    };

    const handleWindowMouseUp = () => {
      const dragState = dragStateRef.current;
      const deltaX = dragState.lastX - dragState.startX;

      window.removeEventListener('mousemove', handleWindowMouseMove);
      finishDragByDelta(deltaX);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp, { once: true });
  }, [finishDragByDelta, getBoundedDragOffset]);

  const handleStageClickCapture = useCallback((event: ReactMouseEvent) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  function getPanelClassName(slideKey: InventorySlideKey) {
    return `dashboard-inventory-switcher__panel${
      slideKey === activeSlide ? ' is-active' : ' is-inactive'
    }`;
  }

  function renderControls(slideKey: InventorySlideKey) {
    return (
      <div
        className="dashboard-inventory-switcher__footer"
        aria-label="홈 재고 섹션 전환"
      >
        {SLIDE_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            className={`dashboard-inventory-switcher__dot${
              item === slideKey ? ' is-active' : ''
            }`}
            aria-label={`${SLIDE_LABELS[item]} 보기`}
            aria-current={item === slideKey ? 'true' : undefined}
            onClick={() => showSlide(item)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="dashboard-inventory-switcher"
      data-active-slide={activeSlide}
      data-active-index={activeSlideIndex}
    >
      <button
        type="button"
        className="dashboard-inventory-switcher__nav dashboard-inventory-switcher__nav--previous"
        disabled={!canGoPrevious}
        aria-label="매장 디자인별 부족 수량 보기"
        onClick={() => showSlide('shortage')}
      />

      <div
        ref={stageRef}
        className={`dashboard-inventory-switcher__stage${
          activeHeight === null ? '' : ' is-measured'
        }${isDragging ? ' is-dragging' : ''}`}
        style={stageStyle}
        aria-label="매장 부족 수량과 목표재고 추적표"
        onClickCapture={handleStageClickCapture}
        onMouseDown={handleStageMouseDown}
      >
        <div className="dashboard-inventory-switcher__track">
          <section
            ref={shortagePanelRef}
            className={getPanelClassName('shortage')}
            aria-hidden={activeSlide !== 'shortage'}
            inert={activeSlide !== 'shortage' ? true : undefined}
          >
            {shortagePanel}
            {renderControls('shortage')}
          </section>

          <section
            ref={trackingPanelRef}
            className={getPanelClassName('tracking')}
            aria-hidden={activeSlide !== 'tracking'}
            inert={activeSlide !== 'tracking' ? true : undefined}
          >
            {trackingPanel}
            {renderControls('tracking')}
          </section>
        </div>
      </div>

      <button
        type="button"
        className="dashboard-inventory-switcher__nav dashboard-inventory-switcher__nav--next"
        disabled={!canGoNext}
        aria-label="목표재고 추적표 보기"
        onClick={() => showSlide('tracking')}
      />
    </div>
  );
}
