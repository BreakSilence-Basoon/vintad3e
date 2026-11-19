'use client';
import { useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';
import { FloatingLanguage } from './floating-language';

let pending: { language: string; id: string; offset: number; contentsOpen: boolean } | null = null;
export function BedroomFixtureControls({ language, label, top }: { language: 'ko' | 'en' | 'ja'; label: string; top: string }) {
  const router = useRouter();
  useLayoutEffect(() => {
    if (pending?.language !== language) return;
    const saved = pending; pending = null;
    const contents = document.querySelector<HTMLDetailsElement>('.bedroom-mobile-contents');
    if (contents) contents.open = saved.contentsOpen;
    const anchor = document.getElementById(saved.id);
    if (anchor) window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - saved.offset, behavior: 'instant' });
  }, [language]);
  return <><FloatingLanguage guide label={label} currentLanguage={language} onLanguageChange={next => {
    if (next === language) return;
    const headings = Array.from(document.querySelectorAll<HTMLElement>('article h2[id]'));
    const anchor = headings.filter(item => item.getBoundingClientRect().top <= 120).at(-1) ?? headings[0];
    if (anchor) pending = { language: next, id: anchor.id, offset: anchor.getBoundingClientRect().top, contentsOpen: document.querySelector<HTMLDetailsElement>('.bedroom-mobile-contents')?.open ?? false };
    router.push(`/proj-bedroom/guide/${next}`, { scroll: false });
  }} />
    <a className="bedroom-backtop" href="#bedroom-top" aria-label={top} title={top}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>
  </>;
}
