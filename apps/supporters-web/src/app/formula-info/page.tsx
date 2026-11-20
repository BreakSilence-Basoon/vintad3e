import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import { fixtureGuideCopy, type FormulaLanguage } from '../../fixture-formula-guide-copy';
import { FormulaGuideLanguage, FormulaGuideNavigation, FormulaGuideReadingTime, FormulaGuideBackToTop, FormulaGuideCopy } from '../../fixture-formula-guide-navigation';
import '../../formula-guide-original.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Supporters > 정산 공식' };
export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fformula-info');
  const requested = (await searchParams).lang;
  const language: FormulaLanguage = requested === 'ja' || requested === 'en' ? requested : 'ko';
  const copy = fixtureGuideCopy[language], sections = copy.sections.map(([id,title]) => ({id,title}));
  return <main className="formula-guide" id="formula-guide-top" lang={language}><FormulaGuideLanguage language={language} label={copy.language} /><div className="formula-guide__title"><div className="formula-guide__title-row"><h1>Supporters</h1><div className="formula-guide__copy-position"><FormulaGuideCopy label={copy.copy} copied={copy.copied} error={copy.copyError} /></div></div><div className="formula-guide__title-meta"><p>{copy.title}</p><span className="formula-guide__read-position"><FormulaGuideReadingTime language={language} minuteUnit={copy.minuteUnit} /></span></div></div><div className="formula-guide__reading"><FormulaGuideNavigation sections={sections} contentsLabel={copy.contents} navigateLabel={copy.navigate} /><article aria-label={copy.title}>{copy.sections.map(([id,title,paragraph])=><section key={id} aria-labelledby={id}><h2 id={id}>{title}</h2><p>{paragraph}</p></section>)}</article></div><FormulaGuideBackToTop label={copy.backTop} /></main>;
}
