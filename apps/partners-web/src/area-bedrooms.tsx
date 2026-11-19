import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bedroomFixtures } from './bedroom-fixture';
import { seoulDate } from './partner-schedule';

export const dynamic = 'force-dynamic';
export default function Page() {
  const partners = bedroomFixtures(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE, seoulDate(new Date()));
  if (!partners) notFound();
  return <main className="staff-console"><div className="partners-settlement-page"><ul className="partners-counterparts" aria-label="협업처별 정산">{partners.map(partner => <li key={partner.id}><Link className="partners-counterpart-card" href={`/proj-bedroom/${partner.id}`} aria-label={partner.name}><div className="partners-counterpart-card__image" aria-hidden="true"><span>이미지</span></div><div className="partners-counterpart-card__body"><strong>{partner.name}</strong><span>{partner.kind}</span></div></Link></li>)}</ul></div></main>;
}
