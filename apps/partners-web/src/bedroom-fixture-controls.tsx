'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { FloatingLanguage } from './floating-language';

let pending: { language: string; id: string; offset: number; contentsOpen: boolean; openIds: string[] } | null = null;
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
    const anchor = document.getElementById(saved.id);
    if (anchor) window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - saved.offset, behavior: 'instant' });
  }, [language]);
  return <><FloatingLanguage guide label={label} currentLanguage={language} onLanguageChange={next => {
    if (next === language) return;
    const headings = Array.from(document.querySelectorAll<HTMLElement>('article h2[id]'));
    const anchor = headings.filter(item => item.getBoundingClientRect().top <= 120).at(-1) ?? headings[0];
    if (anchor) pending = { language: next, id: anchor.id, offset: anchor.getBoundingClientRect().top, contentsOpen: document.querySelector<HTMLDetailsElement>('.bedroom-mobile-contents')?.open ?? false, openIds: Array.from(document.querySelectorAll<HTMLDetailsElement>('.bedroom-intro-toggle[open]')).map(item => item.id) };
    router.push(`/proj-bedroom/guide/${next}`, { scroll: false });
  }} />
    <a className="bedroom-backtop" href="#bedroom-top" aria-label={top} title={top}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>
  </>;
}
