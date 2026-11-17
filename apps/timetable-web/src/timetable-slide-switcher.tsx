'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

export type TimetableSlide = Readonly<{
  key: string;
  label: string;
  content: ReactNode;
}>;

type TimetableSlideSwitcherProps = {
  ariaLabel: string;
  initialSlide?: string;
  searchParamName?: string;
  slides: readonly [TimetableSlide, TimetableSlide];
};

type DragState = {
  active: boolean;
  lastX: number;
  lastY: number;
  pointerId: number | null;
  startX: number;
  startY: number;
};

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(
        target.closest(
          'button, a, input, textarea, select, label, [contenteditable="true"], [data-slide-swipe-ignore]',
        ),
      )
    : false;
}

function getInitialSlideIndex(
  slides: TimetableSlideSwitcherProps['slides'],
  initialSlide: string | undefined,
) {
  const requestedIndex = initialSlide
    ? slides.findIndex((slide) => slide.key === initialSlide)
    : -1;

  return requestedIndex >= 0 ? requestedIndex : 0;
}

export function TimetableSlideSwitcher({
  ariaLabel,
  initialSlide,
  searchParamName = 'view',
  slides,
}: TimetableSlideSwitcherProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(() =>
    getInitialSlideIndex(slides, initialSlide),
  );
  const router = useRouter();
  const [, startSlideNavigation] = useTransition();
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const activeSlideIndexRef = useRef(activeSlideIndex);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef<DragState>({
    active: false,
    lastX: 0,
    lastY: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
  });

  const lastSlideIndex = slides.length - 1;
  const activeSlide = slides[activeSlideIndex] ?? slides[0];
  const stageStyle = {
    '--drag-offset': `${dragOffset}px`,
    '--slide-translate': `${activeSlideIndex * -100}%`,
    ...(activeHeight === null
      ? {}
      : { '--active-panel-height': `${activeHeight}px` }),
  } as CSSProperties;

  useLayoutEffect(() => {
    const activePanel = panelRefs.current[activeSlideIndex];

    if (!activePanel) {
      return;
    }

    const observedPanel = activePanel;

    function measureActivePanel() {
      setActiveHeight(observedPanel.offsetHeight);
    }

    measureActivePanel();

    const resizeObserver = new ResizeObserver(measureActivePanel);
    resizeObserver.observe(observedPanel);

    const frameId = window.requestAnimationFrame(measureActivePanel);
    window.addEventListener('resize', measureActivePanel);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measureActivePanel);
    };
  }, [activeSlideIndex]);

  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;

    if (searchParamName) {
      const url = new URL(window.location.href);
      const slideKey = slides[activeSlideIndex]?.key;

      if (slideKey && url.searchParams.get(searchParamName) !== slideKey) {
        url.searchParams.set(searchParamName, slideKey);
        // 주소만 바꾸는 게 아니라 실제로 옮긴다. 서버가 지금 보는 화면 것만
        // 불러오게 하려면 이동이 필요하다. 예전처럼 주소만 갈아끼우면 서버는
        // 두 화면 몫을 늘 함께 불러온다.
        startSlideNavigation(() => {
          // replace 로 옮긴다. 예전처럼 뒤로 가기 기록은 쌓지 않으면서
          // 서버가 지금 보는 화면 것만 다시 불러오게 한다.
          router.replace(`${url.pathname}${url.search}${url.hash}`, {
            scroll: false,
          });
        });
      }
    }
  }, [activeSlideIndex, router, searchParamName, slides]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  function showSlide(nextSlideIndex: number) {
    if (
      nextSlideIndex < 0 ||
      nextSlideIndex > lastSlideIndex ||
      nextSlideIndex === activeSlideIndex
    ) {
      return;
    }

    setDragOffset(0);
    setIsDragging(false);
    isDraggingRef.current = false;
    activeSlideIndexRef.current = nextSlideIndex;
    setActiveSlideIndex(nextSlideIndex);
  }

  const resetDrag = useCallback(() => {
    dragStateRef.current = {
      active: false,
      lastX: 0,
      lastY: 0,
      pointerId: null,
      startX: 0,
      startY: 0,
    };
    setDragOffset(0);
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  const getBoundedDragOffset = useCallback(
    (rawDeltaX: number) => {
      const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 1;
      const maxOffset = Math.max(stageWidth * 0.42, 1);
      const canMoveToNext = activeSlideIndexRef.current < lastSlideIndex;
      const canMoveToPrevious = activeSlideIndexRef.current > 0;
      const directionalDelta =
        (rawDeltaX < 0 && canMoveToNext) ||
        (rawDeltaX > 0 && canMoveToPrevious)
          ? rawDeltaX
          : rawDeltaX * 0.22;

      return Math.max(Math.min(directionalDelta, maxOffset), -maxOffset);
    },
    [lastSlideIndex],
  );

  const finishDragByDelta = useCallback(
    (deltaX: number) => {
      const dragState = dragStateRef.current;

      if (!dragState.active) {
        return;
      }

      const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 1;
      const threshold = Math.min(150, Math.max(72, stageWidth * 0.16));
      const shouldGoNext =
        deltaX < -threshold &&
        activeSlideIndexRef.current < lastSlideIndex;
      const shouldGoPrevious =
        deltaX > threshold && activeSlideIndexRef.current > 0;
      const shouldSuppressClick = isDraggingRef.current;
      const nextSlideIndex = shouldGoNext
        ? activeSlideIndexRef.current + 1
        : shouldGoPrevious
          ? activeSlideIndexRef.current - 1
          : activeSlideIndexRef.current;

      resetDrag();
      suppressClickRef.current = shouldSuppressClick;

      if (nextSlideIndex !== activeSlideIndexRef.current) {
        activeSlideIndexRef.current = nextSlideIndex;
        setActiveSlideIndex(nextSlideIndex);
      }
    },
    [lastSlideIndex, resetDrag],
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;

      if (
        !event.isPrimary ||
        event.button !== 0 ||
        isInteractiveDragTarget(event.target) ||
        !stage ||
        stage.querySelector('dialog[open]')
      ) {
        return;
      }

      dragStateRef.current = {
        active: true,
        lastX: event.clientX,
        lastY: event.clientY,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };

      const handleWindowPointerMove = (moveEvent: PointerEvent) => {
        const dragState = dragStateRef.current;

        if (
          !dragState.active ||
          dragState.pointerId !== moveEvent.pointerId
        ) {
          return;
        }

        const deltaX = moveEvent.clientX - dragState.startX;
        const deltaY = moveEvent.clientY - dragState.startY;
        dragState.lastX = moveEvent.clientX;
        dragState.lastY = moveEvent.clientY;

        if (!isDraggingRef.current && Math.abs(deltaX) < 8) {
          return;
        }

        if (
          !isDraggingRef.current &&
          Math.abs(deltaY) > Math.abs(deltaX)
        ) {
          return;
        }

        moveEvent.preventDefault();
        isDraggingRef.current = true;
        setIsDragging(true);
        setDragOffset(getBoundedDragOffset(deltaX));
      };

      const removeWindowListeners = () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointercancel', handleWindowPointerCancel);
      };

      const handleWindowPointerUp = (upEvent: PointerEvent) => {
        const dragState = dragStateRef.current;

        if (dragState.pointerId !== upEvent.pointerId) {
          return;
        }

        const deltaX = dragState.lastX - dragState.startX;
        removeWindowListeners();
        finishDragByDelta(deltaX);
      };

      const handleWindowPointerCancel = (cancelEvent: PointerEvent) => {
        if (dragStateRef.current.pointerId !== cancelEvent.pointerId) {
          return;
        }

        removeWindowListeners();
        resetDrag();
      };

      window.addEventListener('pointermove', handleWindowPointerMove, {
        passive: false,
      });
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerCancel);
    },
    [finishDragByDelta, getBoundedDragOffset, resetDrag],
  );

  const handleStageClickCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    },
    [],
  );

  return (
    <section
      className="timetable-slide-switcher"
      data-active-index={activeSlideIndex}
      data-active-slide={activeSlide.key}
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="슬라이드"
    >
      <div
        className="timetable-slide-switcher__footer"
        aria-label={`${ariaLabel} 화면 전환`}
        role="group"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            className={`timetable-slide-switcher__dot${
              index === activeSlideIndex ? ' is-active' : ''
            }`}
            aria-label={`${slide.label} 보기`}
            aria-current={index === activeSlideIndex ? 'true' : undefined}
            onClick={() => showSlide(index)}
          />
        ))}
      </div>

      <div
        ref={stageRef}
        className={`timetable-slide-switcher__stage${
          activeHeight === null ? '' : ' is-measured'
        }${isDragging ? ' is-dragging' : ''}`}
        style={stageStyle}
        onClickCapture={handleStageClickCapture}
        onPointerDown={handleStagePointerDown}
      >
        <div className="timetable-slide-switcher__track">
          {slides.map((slide, index) => {
            const isActive = index === activeSlideIndex;

            return (
              <section
                key={slide.key}
                ref={(node) => {
                  panelRefs.current[index] = node;
                }}
                className={`timetable-slide-switcher__panel ${
                  isActive ? 'is-active' : 'is-inactive'
                }`}
                aria-label={`${index + 1}/${slides.length} ${slide.label}`}
                aria-hidden={!isActive}
                aria-roledescription="화면"
                inert={!isActive ? true : undefined}
                role="group"
              >
                {slide.content}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
