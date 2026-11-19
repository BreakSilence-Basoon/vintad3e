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

type FormulaSlideKey = 'flow' | 'reference';

type FormulaSectionSwitcherProps = {
  flowPanel: ReactNode;
  referencePanel: ReactNode;
};

type DragState = {
  active: boolean;
  startX: number;
  lastX: number;
};

const SLIDE_LABELS: Record<FormulaSlideKey, string> = {
  flow: '정산 공식 흐름',
  reference: '정산 공식 기준',
};

const SLIDE_ORDER: FormulaSlideKey[] = ['flow', 'reference'];

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(
        target.closest(
          'button, a, input, textarea, select, label, [contenteditable="true"]',
        ),
      )
    : false;
}

export function FormulaSectionSwitcher({
  flowPanel,
  referencePanel,
}: FormulaSectionSwitcherProps) {
  const [activeSlide, setActiveSlide] = useState<FormulaSlideKey>('flow');
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const flowPanelRef = useRef<HTMLElement | null>(null);
  const referencePanelRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef<FormulaSlideKey>(activeSlide);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef<DragState>({
    active: false,
    startX: 0,
    lastX: 0,
  });

  const activeSlideIndex = SLIDE_ORDER.indexOf(activeSlide);
  const previousSlide = SLIDE_ORDER[activeSlideIndex - 1] ?? null;
  const nextSlide = SLIDE_ORDER[activeSlideIndex + 1] ?? null;
  const canGoPrevious = previousSlide !== null;
  const canGoNext = nextSlide !== null;
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
      activeSlide === 'flow'
        ? flowPanelRef.current
        : referencePanelRef.current;

    if (!activePanel) {
      return;
    }

    function measureActivePanel() {
      if (!activePanel) {
        return;
      }

      setActiveHeight(Math.ceil(activePanel.offsetHeight));
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
  }, [activeSlide, flowPanel, referencePanel]);

  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  function showSlide(nextSlide: FormulaSlideKey) {
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
    const currentIndex = SLIDE_ORDER.indexOf(activeSlideRef.current);
    const canMoveToNext = currentIndex < SLIDE_ORDER.length - 1;
    const canMoveToPrevious = currentIndex > 0;
    const directionalDelta =
      (rawDeltaX < 0 && canMoveToNext) ||
      (rawDeltaX > 0 && canMoveToPrevious)
        ? rawDeltaX
        : rawDeltaX * 0.22;

    return Math.max(Math.min(directionalDelta, maxOffset), -maxOffset);
  }, []);

  const finishDragByDelta = useCallback(
    (deltaX: number) => {
      const dragState = dragStateRef.current;

      if (!dragState.active) {
        return;
      }

      const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 1;
      const threshold = Math.min(150, Math.max(72, stageWidth * 0.16));
      const currentIndex = SLIDE_ORDER.indexOf(activeSlideRef.current);
      const targetNextSlide = SLIDE_ORDER[currentIndex + 1] ?? null;
      const targetPreviousSlide = SLIDE_ORDER[currentIndex - 1] ?? null;
      const shouldGoNext = deltaX < -threshold && targetNextSlide !== null;
      const shouldGoPrevious =
        deltaX > threshold && targetPreviousSlide !== null;
      const shouldSuppressClick = isDraggingRef.current;

      resetDrag();
      suppressClickRef.current = shouldSuppressClick;

      if (shouldGoNext && targetNextSlide) {
        setActiveSlide(targetNextSlide);
        return;
      }

      if (shouldGoPrevious && targetPreviousSlide) {
        setActiveSlide(targetPreviousSlide);
      }
    },
    [resetDrag],
  );

  const handleStageMouseDown = useCallback(
    (event: ReactMouseEvent) => {
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
    },
    [finishDragByDelta, getBoundedDragOffset],
  );

  const handleStageClickCapture = useCallback((event: ReactMouseEvent) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  function getPanelClassName(slideKey: FormulaSlideKey) {
    return `formula-section-switcher__panel${
      slideKey === activeSlide ? ' is-active' : ' is-inactive'
    }`;
  }

  function renderControls() {
    return (
      <div
        className="formula-section-switcher__footer"
        aria-label="정산 공식 섹션 전환"
      >
        {SLIDE_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            className={`formula-section-switcher__dot${
              item === activeSlide ? ' is-active' : ''
            }`}
            aria-label={`${SLIDE_LABELS[item]} 보기`}
            aria-current={item === activeSlide ? 'true' : undefined}
            onClick={() => showSlide(item)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="formula-section-switcher"
      data-active-slide={activeSlide}
      data-active-index={activeSlideIndex}
    >
      <button
        type="button"
        className="formula-section-switcher__nav formula-section-switcher__nav--previous"
        disabled={!canGoPrevious}
        aria-label={
          previousSlide ? `${SLIDE_LABELS[previousSlide]} 보기` : '이전 섹션'
        }
        onClick={() => {
          if (previousSlide) {
            showSlide(previousSlide);
          }
        }}
      />

      <div
        ref={stageRef}
        className={`formula-section-switcher__stage${
          activeHeight === null ? '' : ' is-measured'
        }${isDragging ? ' is-dragging' : ''}`}
        style={stageStyle}
        aria-label="정산 공식 흐름과 기준"
        onClickCapture={handleStageClickCapture}
        onMouseDown={handleStageMouseDown}
      >
        <div className="formula-section-switcher__track">
          <section
            ref={flowPanelRef}
            className={getPanelClassName('flow')}
            aria-hidden={activeSlide !== 'flow'}
            inert={activeSlide !== 'flow' ? true : undefined}
          >
            <div className="formula-section-switcher__content">
              {flowPanel}
            </div>
          </section>

          <section
            ref={referencePanelRef}
            className={getPanelClassName('reference')}
            aria-hidden={activeSlide !== 'reference'}
            inert={activeSlide !== 'reference' ? true : undefined}
          >
            <div className="formula-section-switcher__content">
              {referencePanel}
            </div>
          </section>
        </div>
      </div>

      {renderControls()}

      <button
        type="button"
        className="formula-section-switcher__nav formula-section-switcher__nav--next"
        disabled={!canGoNext}
        aria-label={nextSlide ? `${SLIDE_LABELS[nextSlide]} 보기` : '다음 섹션'}
        onClick={() => {
          if (nextSlide) {
            showSlide(nextSlide);
          }
        }}
      />
    </div>
  );
}
