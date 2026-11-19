import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@vintad3e/ui/components';
import { samplePartners } from '../../bedroom-fixture';
import { fixtureOrigin, fixtureSession } from '../../fixture-session.mjs';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Partners > 계정 추가' };
export default async function AccountsPage() {
  const origin = fixtureOrigin(process.env);
  if (!origin) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in?next=%2Faccounts');
  return <main className="staff-console"><header className="staff-page__header"><h1>계정 추가</h1></header>
    <section className="partners-agreement partners-accountant" aria-labelledby="account-heading"><h2 id="account-heading">협업자 계정</h2>
      <p>협업자가 사용할 Google 계정과 열람할 협업을 지정합니다.</p><div className="partners-accountant__fields">
        <label>Google 이메일<input type="email" placeholder="name@gmail.com" autoComplete="off" /></label>
        <label>협업<select defaultValue=""><option value="" disabled>협업 선택</option>{samplePartners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>
        <div className="partners-accountant__actions"><Button type="button" disabled>계정 추가</Button></div>
      </div></section>
  </main>;
}
