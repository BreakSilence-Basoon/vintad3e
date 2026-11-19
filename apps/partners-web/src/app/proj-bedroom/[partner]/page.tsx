import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bedroomFixture } from '../../../bedroom-fixture';
import { seoulDate } from '../../../partner-schedule';
import { SettlementLedger } from '../../../settlement-ledger';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ partner: string }> }) {
  const fixture = bedroomFixture(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()), (await params).partner);
  if (!fixture) notFound();
  const { partner, ledger } = fixture;
  return <main className="staff-console"><div className="partners-settlement-page"><header className="partners-counterpart-heading"><Link href="/proj-bedroom">협업처 목록</Link><h1>{partner.name}</h1></header><details className="partners-settlement-terms"><summary>정산 조건 확인</summary><dl>{partner.terms.map(term => <div key={term.label}><dt>{term.label}</dt><dd>{term.value}</dd></div>)}</dl><a href={partner.source} target="_blank" rel="noreferrer">조건 근거 문서</a></details><SettlementLedger data={ledger} counterpartyLabel="정산 대상" /></div></main>;
}
