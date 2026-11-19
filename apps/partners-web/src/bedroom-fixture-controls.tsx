'use client';
import { useRouter } from 'next/navigation';
import { FloatingLanguage } from './floating-language';

export function BedroomFixtureControls({ language, label, top }: { language: 'ko' | 'en' | 'ja'; label: string; top: string }) {
  const router = useRouter();
  return <><FloatingLanguage guide label={label} currentLanguage={language} onLanguageChange={next => { if (next !== language) router.push(`/proj-bedroom/guide/${next}`, { scroll: false }); }} />
    <a className="bedroom-backtop" href="#bedroom-top" aria-label={top} title={top}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 11 7-7 7 7M12 4v16" /></svg></a>
  </>;
}
