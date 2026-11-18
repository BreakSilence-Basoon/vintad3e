import { getLibraryFixtures } from '../../library-fixture';
import { FixtureMypage } from '../../fixture-mypage';

export const dynamic = 'force-dynamic';
export default function MypagePage() {
  const documents = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="마이페이지"><FixtureMypage documents={documents} /></section></main>;
}
