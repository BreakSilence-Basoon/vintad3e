import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';
import { calculateFixtureFormula, formatFixtureFormula } from '../../formula-config.mjs';
import settings from '../../formula-fixture-settings.json';
import { FormulaSectionSwitcher } from '../../formula-section-switcher';
import { FixtureFormulaDictionary } from '../../formula-fixture-dictionary';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Supporters > 정산 공식' };

export default async function Page() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Fformula');
  if (process.env.VINTAD3E_SUPPORTERS_FIXTURE_SELF === '1') redirect('/formula-info');
  const result = calculateFixtureFormula(settings.expression, settings.variables);
  const expression = formatFixtureFormula(settings.expression, settings.variables);
  if (result === null || expression === null) notFound();
  const amount = `${settings.variables.amount.toLocaleString('ko-KR')}원`;
  const rate = settings.variables.rate.toLocaleString('ko-KR');
  const payout = `${result.toLocaleString('ko-KR')}원`;
  return <main className="gtm-console"><section className="gtm-page formula-page"><FormulaSectionSwitcher
    flowPanel={<section className="gtm-section formula-section formula-section--slide-card" aria-label="정산 공식 흐름"><div className="formula-diagram"><div className="formula-diagram__lane"><div className="formula-diagram__row formula-diagram__row--company"><div className="formula-node"><strong>정산 기준 금액</strong><small>{amount}</small></div><b className="formula-operator">→</b><div className="formula-node"><strong>계산식</strong><small>{expression}</small></div><b className="formula-operator">=</b><div className="formula-node formula-node--accent"><strong>정산 금액</strong><small>{payout}</small></div></div></div></div></section>}
    referencePanel={<section className="gtm-section formula-section formula-section--slide-card" aria-label="정산 공식 기준"><div className="formula-table-shell"><table className="formula-table formula-cost-table"><thead><tr><th>항목</th><th>기준</th><th>결과</th></tr></thead><tbody><tr><td>정산 금액</td><td>{expression}</td><td>{payout}</td></tr></tbody></table></div></section>}
  /><FixtureFormulaDictionary amount={amount} rate={rate} /></section></main>;
}
