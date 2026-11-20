'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormulaLanguage } from './fixture-formula-guide-copy';
import { FormulaGuideDisclosure } from './fixture-formula-guide-disclosure';

type Section = { id: string; title: string; nested?: boolean };

export function FormulaGuideReadingTime({ language, minuteUnit }: { language: FormulaLanguage; minuteUnit: string }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    const article = document.querySelector('.formula-guide__reading article');
    const text = Array.from(article?.querySelectorAll('h2, h3, p, summary, li') ?? []).map((element) => element.textContent ?? '').join(' ');
    const length = language === 'en' ? text.trim().split(/\s+/).filter(Boolean).length : text.replace(/\s/g, '').length;
    // The reading time is derived from rendered DOM text, which is unavailable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize with the rendered article
    setMinutes(Math.max(1, Math.ceil(length / (language === 'en' ? 265 : 500))));
  }, [language]);
  if (minutes === null) return null;
  return <span className="formula-guide__read-time"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span>{language === 'ko' ? '약 ' : language === 'ja' ? '約 ' : 'About '}{minutes}{language === 'en' ? ' ' : ''}{minuteUnit}</span></span>;
}

export function FormulaGuideNavigation({ sections, contentsLabel, navigateLabel }: { sections: Section[]; contentsLabel: string; navigateLabel: string }) {
  const [active, setActive] = useState(sections[0]?.id);
  const [showMinimap, setShowMinimap] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShowMinimap((document.querySelector('.formula-guide__contents')?.getBoundingClientRect().bottom ?? Infinity) < 0);
      let next = sections[0]?.id;
      for (const section of sections) {
        if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= 160) next = section.id;
      }
      setActive(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
  }, [sections]);

  return <>
    <FormulaGuideDisclosure className="formula-guide__contents" summary={<>{contentsLabel} <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></>}>
      <nav aria-label={contentsLabel}><ol>{sections.map((section) => <li key={section.id} className={section.nested ? "formula-guide__contents-subitem" : undefined}><a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined} onClick={(event) => { setActive(section.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{section.title}</a></li>)}</ol></nav>
    </FormulaGuideDisclosure>
    <nav className="formula-guide__minimap" aria-label={navigateLabel} hidden={!showMinimap}>
      {sections.map((section) => <a href={`#${section.id}`} key={section.id} data-nested={section.nested || undefined} aria-label={section.title} aria-current={active === section.id ? 'location' : undefined}><span className="formula-guide__minimap-line" /><span className="formula-guide__minimap-label">{section.title}</span></a>)}
    </nav>
  </>;
}

let pendingPosition: { language: FormulaLanguage; sectionId: string | null; top: number; openIds: string[]; contentsOpen: boolean } | null = null;

function savePosition(language: FormulaLanguage) {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.formula-guide__reading article section'));
  const current = sections.filter((section) => section.getBoundingClientRect().top <= 160).at(-1) ?? sections[0];
  pendingPosition = { language, sectionId: current?.getAttribute('aria-labelledby') ?? null, top: current?.getBoundingClientRect().top ?? 0, openIds: Array.from(document.querySelectorAll<HTMLDetailsElement>('.formula-guide__disclosure[open]')).map((element) => element.id), contentsOpen: document.querySelector<HTMLDetailsElement>('.formula-guide__contents')?.open ?? false };
}

type LanguageCorner = 'top-left' | 'top-right' | 'bottom-left';
const languageNames: Record<FormulaLanguage, string> = { ko: '한국어', ja: '日本語', en: 'English' };

export function FormulaGuideLanguage({ language, label }: { language: FormulaLanguage; label: string }) {
  const router = useRouter();
  const [corner, setCorner] = useState<LanguageCorner>('bottom-left');
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const control = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem('supporters-formula-language-corner');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the browser-only saved position
    if (saved === 'top-left' || saved === 'top-right' || saved === 'bottom-left') setCorner(saved);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  useLayoutEffect(() => {
    if (pendingPosition?.language !== language) return;
    const saved = pendingPosition; pendingPosition = null;
    for (const id of saved.openIds) { const element = document.getElementById(id); if (element instanceof HTMLDetailsElement) element.open = true; }
    const contents = document.querySelector<HTMLDetailsElement>('.formula-guide__contents');
    if (contents) contents.open = saved.contentsOpen;
    const anchor = saved.sectionId ? document.getElementById(saved.sectionId)?.closest('section') : null;
    if (anchor) window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - saved.top, behavior: 'instant' });
  }, [language]);
  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    if (start.moved) {
      const choices: LanguageCorner[] = ['top-left', 'top-right', 'bottom-left'];
      const distance = (candidate: LanguageCorner) => Math.hypot(event.clientX - (candidate.endsWith('right') ? window.innerWidth - 71 : 71), event.clientY - (candidate.startsWith('bottom') ? window.innerHeight - 40 : 40));
      const next = choices.reduce((best, candidate) => distance(candidate) < distance(best) ? candidate : best);
      setCorner(next); localStorage.setItem('supporters-formula-language-corner', next); suppressClick.current = true;
    }
    drag.current = null; setPosition(null);
  }
  const style = position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined;
  return <div ref={control} className="formula-guide__language-float" data-corner={corner} data-dragging={position ? 'true' : undefined} style={style}>
    <div className="formula-guide__language-bar" data-open={open}>
      <button type="button" className="formula-guide__language-trigger" aria-label={label} aria-expanded={open} onPointerDown={(event) => {
        if (event.button !== 0) return;
        const rect = control.current!.getBoundingClientRect();
        drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={(event) => {
        const start = drag.current; if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 6) return;
        start.moved = true; setOpen(false);
        setPosition({ x: Math.max(8, Math.min(window.innerWidth - 118, start.left + dx)), y: Math.max(8, Math.min(window.innerHeight - 56, start.top + dy)) });
      }} onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; setPosition(null); }} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen((value) => !value); }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg><span>{languageNames[language]}</span>
      </button>
      <div className="formula-guide__language-choices" inert={!open} aria-hidden={!open}>{(['ko', 'ja', 'en'] as const).filter((item) => item !== language).map((item) => <button key={item} type="button" lang={item} onClick={() => { savePosition(item); setOpen(false); router.push(`/formula-info?lang=${item}`, { scroll: false }); }}>{languageNames[item]}</button>)}</div>
    </div>
  </div>;
}

export function FormulaGuideBackToTop({ label }: { label: string }) {
  const [bottom, setBottom] = useState(16);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; const top = document.querySelector('.public-footer')?.getBoundingClientRect().top ?? Infinity; const next = Math.max(16, window.innerHeight - top + 16); document.querySelector<HTMLElement>('.formula-guide')?.style.setProperty('--formula-floating-bottom', `${next}px`); setBottom(next); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return <a className="formula-guide__backtop" style={{ bottom }} href="#formula-guide-top" aria-label={label} title={label} onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); history.replaceState(null, '', '#formula-guide-top'); }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>;
}

export function FormulaGuideCopy({ label, copied, error }: { label: string; copied: string; error: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  useEffect(() => { if (status === 'idle') return; const timer = setTimeout(() => setStatus('idle'), 3000); return () => clearTimeout(timer); }, [status]);
  return <div className="formula-guide__copy"><button type="button" onClick={async () => {
    try {
      const article = document.querySelector('.formula-guide__reading article');
      if (!article) throw new Error('missing article');
      const lines = Array.from(article.querySelectorAll('h2, h3, p, summary, li')).map((element) => element.textContent?.trim()).filter(Boolean);
      await navigator.clipboard.writeText(lines.join('\n\n'));
      setStatus('copied');
    } catch { setStatus('error'); }
  }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg><span>{status === 'copied' ? copied : label}</span></button><span className={status === 'error' ? 'formula-guide__copy-error' : 'formula-guide__visually-hidden'} role="status">{status === 'error' ? error : status === 'copied' ? copied : ''}</span></div>;
}
