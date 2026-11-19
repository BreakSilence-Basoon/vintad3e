import { getFixtureMembers } from '../../fixture-members';
import { DocumentRegistrationForm, PublicationForm } from '../../publication-form';

export const metadata = { title: '침깨 > Library > 게시' };
export const dynamic = 'force-dynamic';
export default function PublishPage() {
  const fixtureEnabled = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_LIBRARY_FIXTURE === '1';
  const members = getFixtureMembers(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="게시">
    <section aria-labelledby="notion-publish-title" className="library-register"><h2 id="notion-publish-title">Notion</h2><DocumentRegistrationForm /></section>
    <section aria-labelledby="file-publish-title" className="library-register"><h2 id="file-publish-title">Markdown · HTML</h2><PublicationForm members={members} fixtureEnabled={fixtureEnabled} /></section>
  </section></main>;
}
