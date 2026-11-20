import { getLibraryFixtures } from '../../library-fixture';
import { FixtureMypage } from '../../fixture-mypage';
import { requireFixtureLibraryStaff } from '../../fixture-staff-access';

export const dynamic = 'force-dynamic';
export default async function MypagePage() {
  await requireFixtureLibraryStaff('/mypage');
  const documents = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="마이페이지"><FixtureMypage documents={documents} /></section></main>;
}
