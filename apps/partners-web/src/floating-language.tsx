'use client';

import { useEffect, useRef, useState } from 'react';

type Language = 'ko' | 'ja' | 'en';
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const names: Record<Language, string> = { ko: '한국어', ja: '日本語', en: 'English' };
const languages: Language[] = ['ko', 'ja', 'en'];

function useFooterOffset() {
  const [offset, setOffset] = useState(16);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; const footer = document.querySelector('.bedroom-footer, .guest-preview-shell > .public-footer, .partners-legal-page > .public-footer'); const top = footer?.getBoundingClientRect().top ?? Infinity; setOffset(Math.min(window.innerHeight - 56, Math.max(16, window.innerHeight - top + 16))); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const footer = document.querySelector('.bedroom-footer, .guest-preview-shell > .public-footer, .partners-legal-page > .public-footer');
    const observer = new ResizeObserver(schedule); if (footer) observer.observe(footer);
    update(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return offset;
}

export function FloatingBackToTop() {
  const offset = useFooterOffset();
  return <a className="guest-backtop" href="#guest-top" aria-label="맨 위로" style={{ bottom: offset }} onClick={event => { event.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>;
}

export function FloatingLanguage({ currentLanguage, onLanguageChange, label = '언어 선택 / Language / 言語', guide = false, avoidBottomRight = false }: { currentLanguage?: Language; onLanguageChange?: (language: Language) => void; label?: string; guide?: boolean; avoidBottomRight?: boolean } = {}) {
  const [language, setLanguage] = useState<Language>(currentLanguage ?? 'ko');
  const [corner, setCorner] = useState<Corner>('bottom-left');
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const footerOffset = useFooterOffset();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    const saved = localStorage.getItem('partners-guest-language');
    const preferred = navigator.language.toLowerCase().split('-')[0];
    const initial = currentLanguage ?? saved ?? preferred;
    setLanguage(initial === 'ko' || initial === 'ja' ? initial : 'en');
    const savedCorner = localStorage.getItem(guide ? 'bedroom-guide-language-corner' : 'partners-guest-language-corner');
    if (savedCorner === 'top-left' || savedCorner === 'top-right' || savedCorner === 'bottom-left' || (!guide && !avoidBottomRight && savedCorner === 'bottom-right')) setCorner(savedCorner);
    });
    return () => cancelAnimationFrame(frame);
  }, [currentLanguage, guide, avoidBottomRight]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !controlRef.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    if (start.moved) {
      const candidates: Corner[] = guide || avoidBottomRight ? ['top-left', 'top-right', 'bottom-left'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const distance = (candidate: Corner) => Math.hypot(event.clientX - (candidate.endsWith('right') ? window.innerWidth - 71 : 71), event.clientY - (candidate.startsWith('bottom') ? window.innerHeight - 40 : 40));
      const next = candidates.reduce((best, candidate) => distance(candidate) < distance(best) ? candidate : best);
      setCorner(next);
      localStorage.setItem(guide ? 'bedroom-guide-language-corner' : 'partners-guest-language-corner', next);
      suppressClick.current = true;
    }
    drag.current = null;
    setPosition(null);
  }
  const style = { '--floating-bottom': `${footerOffset}px`, ...(position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : {}) } as React.CSSProperties;
  return <div ref={controlRef} className="guest-language-float" data-corner={corner} data-dragging={position ? 'true' : undefined} style={style}>
    <div className="guest-language-float__bar" data-open={open}>
      <button type="button" className="guest-language-float__trigger" aria-label={label} aria-expanded={open} onPointerDown={event => {
        if (event.button !== 0) return;
        const rect = controlRef.current!.getBoundingClientRect();
        drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 6) return;
        start.moved = true; setOpen(false);
        setPosition({ x: Math.max(8, Math.min(window.innerWidth - 110 - 8, start.left + dx)), y: Math.max(8, Math.min(window.innerHeight - 48 - 8, start.top + dy)) });
      }} onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; setPosition(null); }} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(value => !value); }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg><span>{names[language]}</span>
      </button>
      <div className="guest-language-float__choices" inert={!open} aria-hidden={!open}>{languages.filter(item => item !== language).map(item => <button key={item} type="button" lang={item} onClick={() => { setLanguage(item); localStorage.setItem('partners-guest-language', item); setOpen(false); onLanguageChange?.(item); }}>{names[item]}</button>)}</div>
    </div>
  </div>;
}
