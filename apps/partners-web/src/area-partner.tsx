import { FixtureStaffProducts } from './fixture-staff-products';
import { ShowroomSettlement } from './fixture-showroom-view';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bedroomFixture } from './bedroom-fixture';
import { seoulDate } from './partner-schedule';
import { SettlementLedger } from './settlement-ledger';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ partner: string }> }) {
  const fixture = bedroomFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()), (await params).partner);
  if (!fixture) notFound();
  const { partner, ledger } = fixture;
  return <main className="staff-console"><div className="partners-settlement-page"><header className="partners-counterpart-heading"><Link href="/proj-bedroom">협업처 목록</Link><h1>{partner.name}</h1></header>
    <details className="partners-settlement-terms"><summary>정산 조건 확인</summary><dl>{partner.terms.map(term => <div key={term.label}><dt>{term.label}</dt><dd>{term.value}</dd></div>)}</dl><a href={partner.source} target="_blank" rel="noreferrer">조건 근거 문서</a></details>
    {partner.id === 'partner-01' ? <div className="showroom-page">
      <nav aria-label="협업 정산"><Link href="/proj-bedroom/partner-01/settlement">{partner.name} 협업 정산 계산</Link></nav>
      <ShowroomSettlement brands={[{code:'fixture-01',name:partner.name,defaultPercent:5}]} />
      <section className="partners-agreement" aria-labelledby="agreement-fixture-01">
        <header className="partners-agreement__heading"><h2 id="agreement-fixture-01">{partner.name}</h2><span>쇼룸 01</span></header>
        <div className="partners-rule"><h3>정산 조건</h3><p>브랜드 지급 비율 5%</p></div>
        <div className="partners-history"><h3>확정 정산 내역</h3><ul><li><details><summary><span>2026. 1. 2. 오전 9:00 ~ 2026. 1. 3. 오전 9:00 미만</span><strong>6,173원</strong></summary>
          <div className="partners-history__detail"><p>2026. 1. 4. 오전 9:00 확정</p><h4>확정 당시 조건</h4><p>브랜드 지급 비율 5%</p>
            <div className="partners-table-scroll" role="region" aria-label="정산 항목" tabIndex={0}><table><thead><tr><th>항목</th><th>수량</th><th>판매 금액</th><th>브랜드 지급액</th></tr></thead><tbody><tr><th scope="row">1</th><td>2</td><td>123,460원</td><td>6,173원</td></tr></tbody></table></div>
          </div></details></li></ul></div>
        <FixtureStaffProducts />
      </section>
    </div> : <SettlementLedger data={ledger} counterpartyLabel="정산 대상" />}
  </div></main>;
}
