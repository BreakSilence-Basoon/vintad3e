import { FixtureBookmarkList } from '../../fixture-bookmark-list';
import { getLibraryFixtures } from '../../library-fixture';

export const dynamic = 'force-dynamic';
export default function BookmarksPage() {
  const documents = getLibraryFixtures(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE);
  return <main className="library-home"><section className="library-page" aria-label="보관함"><section aria-labelledby="saved-posts-title"><h2 id="saved-posts-title">저장한 게시물</h2><FixtureBookmarkList documents={documents} /></section></section></main>;
}
