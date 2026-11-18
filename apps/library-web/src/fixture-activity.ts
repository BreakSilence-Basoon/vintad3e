import { parseFixtureComments, type FixtureComment } from './fixture-comments.ts';
import { searchLibraryFixtures, type FixtureDocument } from './library-fixture.ts';

export type FixtureActivityComment = FixtureComment & { publicationId: string; documentTitle: string };
export function fixtureActivity(documents: FixtureDocument[], snapshots: string[]) {
  const comments = documents.flatMap((document, index) => parseFixtureComments(snapshots[index] ?? '[]').map(comment => ({ ...comment, publicationId: document.id, documentTitle: document.title })))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return { documents: searchLibraryFixtures(documents, ''), comments: comments.slice(0, 200), hasMoreComments: comments.length > 200 };
}
