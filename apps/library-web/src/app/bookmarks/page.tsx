import { FixtureBookmarkList } from '../../fixture-bookmark-list';
import { getLibraryFixtures } from '../../library-fixture';
import { requireFixtureLibraryStaff } from '../../fixture-staff-access';
import { fixtureReadError } from '../../fixture-read-error';

export const dynamic = 'force-dynamic';
export default async function BookmarksPage() {
  await requireFixtureLibraryStaff('/bookmarks');
  const documents = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="보관함">{fixtureReadError(process.env) ? <p className="library-inline-error" role="alert">보관함을 불러오지 못했습니다.</p> : <section aria-labelledby="saved-posts-title"><h2 id="saved-posts-title">저장한 게시물</h2><FixtureBookmarkList documents={documents} /></section>}</section></main>;
}
