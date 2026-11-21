'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { FloatingLanguage } from './floating-language';

let pending: { language: string; id?: string; offset: number; fraction: number; readingLine: number; contentsOpen: boolean; openIds: string[] } | null = null;
const copyLabels = {
  ko: { label: '내용 복사', copied: '복사됨', error: '복사하지 못했습니다. 다시 눌러 주세요.' },
  en: { label: 'Copy content', copied: 'Copied', error: 'Could not copy. Please try again.' },
  ja: { label: '本文をコピー', copied: 'コピーしました', error: 'コピーできませんでした。もう一度お試しください。' },
};
export function BedroomFixtureCopy({ language, markdown }: { language: keyof typeof copyLabels; markdown: string }) {
  const text = copyLabels[language];
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  useEffect(() => { if (status === 'idle') return; const timer = setTimeout(() => setStatus('idle'), 3000); return () => clearTimeout(timer); }, [status]);
  return <div className="bedroom-copy"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(markdown); setStatus('copied'); } catch { setStatus('error'); } }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg><span>{status === 'copied' ? text.copied : text.label}</span></button><span className={status === 'error' ? 'bedroom-copy-error' : 'bedroom-visually-hidden'} role="status">{status === 'copied' ? text.copied : status === 'error' ? text.error : ''}</span></div>;
}
export function BedroomFixtureControls({ language, label, top }: { language: 'ko' | 'en' | 'ja'; label: string; top: string }) {
  const router = useRouter();
  useLayoutEffect(() => {
    if (pending?.language !== language) return;
    const saved = pending; pending = null;
    for (const id of saved.openIds) { const element = document.getElementById(id); if (element instanceof HTMLDetailsElement) element.open = true; }
    const contents = document.querySelector<HTMLDetailsElement>('.bedroom-mobile-contents');
    if (contents) contents.open = saved.contentsOpen;
    const anchor = saved.id ? document.getElementById(saved.id) : null;
    if (!anchor) return;
    const track = anchor.closest<HTMLElement>('.bedroom-image-track');
    if (track && anchor instanceof HTMLElement && track.firstElementChild instanceof HTMLElement) track.scrollLeft = anchor.offsetLeft - track.firstElementChild.offsetLeft;
    const rect = anchor.getBoundingClientRect();
    const offset = saved.fraction ? saved.readingLine - saved.fraction * rect.height : saved.offset;
    window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'instant' });
  }, [language]);
  return <><FloatingLanguage guide label={label} currentLanguage={language} onLanguageChange={next => {
    if (next === language) return;
    const readingLine = Math.min(120, innerHeight * .2);
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('article [id]')).map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.height > 0 && rect.bottom > readingLine && rect.left < innerWidth / 2 && rect.right > innerWidth / 2);
    const anchor = blocks.filter(({ rect }) => rect.top <= readingLine).at(-1) ?? blocks[0];
    pending = { language: next, id: anchor?.element.id, offset: anchor?.rect.top ?? 0, fraction: anchor && anchor.rect.top < readingLine ? (readingLine - anchor.rect.top) / anchor.rect.height : 0, readingLine, contentsOpen: document.querySelector<HTMLDetailsElement>('.bedroom-mobile-contents')?.open ?? false, openIds: Array.from(document.querySelectorAll<HTMLDetailsElement>('.bedroom-intro-toggle[open]')).map(item => item.id) };
    router.push(`/proj-bedroom/guide/${next}`, { scroll: false });
  }} />
    <a className="bedroom-backtop" href="#bedroom-top" aria-label={top} title={top}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>
  </>;
}
