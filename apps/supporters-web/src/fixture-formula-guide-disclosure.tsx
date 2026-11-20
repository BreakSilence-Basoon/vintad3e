'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function FormulaGuideDisclosure({ summary, children, className, id }: { summary: ReactNode; children: ReactNode; className: string; id?: string }) {
  const element = useRef<HTMLDetailsElement>(null);
  const animation = useRef<Animation | null>(null);
  const targetOpen = useRef(false);
  useEffect(() => () => animation.current?.cancel(), []);
  return <details ref={element} className={className} id={id}><summary onClick={(event) => {
    const details = element.current;
    if (!details) return;
    event.preventDefault();
    const opening = animation.current ? !targetOpen.current : !details.open;
    targetOpen.current = opening;
    const from = details.getBoundingClientRect().height;
    animation.current?.cancel();
    details.open = opening;
    details.dataset.expanded = String(opening);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { animation.current = null; details.style.removeProperty('overflow'); return; }
    const to = details.getBoundingClientRect().height;
    if (!opening) details.open = true;
    details.style.overflow = 'hidden';
    const current = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: 260, easing: 'cubic-bezier(.2,0,0,1)' });
    animation.current = current;
    current.onfinish = () => { details.open = opening; details.style.removeProperty('overflow'); animation.current = null; };
  }}>{summary}</summary>{children}</details>;
}
