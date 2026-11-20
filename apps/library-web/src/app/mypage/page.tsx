import { getLibraryFixtures } from '../../library-fixture';
import { FixtureMypage } from '../../fixture-mypage';
import { requireFixtureLibraryStaff } from '../../fixture-staff-access';
import { fixtureReadError } from '../../fixture-read-error';

export const dynamic = 'force-dynamic';
export default async function MypagePage() {
  await requireFixtureLibraryStaff('/mypage');
  const documents = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="마이페이지">{fixtureReadError(process.env) ? <p className="library-inline-error" role="alert">내 활동을 불러오지 못했습니다.</p> : <FixtureMypage documents={documents} />}</section></main>;
}
