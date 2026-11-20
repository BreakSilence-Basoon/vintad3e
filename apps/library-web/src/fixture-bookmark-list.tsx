'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { bookmarkServerSnapshot, bookmarkSnapshot, parseFixtureBookmarks, subscribeBookmarks } from './fixture-bookmarks';
import { libraryDate, searchLibraryFixtures, type FixtureDocument } from './library-fixture';
import { publishedDocument, publishedSnapshot, publishedServerSnapshot, subscribePublished } from './fixture-published-state';

export function FixtureBookmarkList({ documents }: { documents: FixtureDocument[] }) {
  const snapshot = useSyncExternalStore(subscribeBookmarks, bookmarkSnapshot, bookmarkServerSnapshot);
  const published = useSyncExternalStore<boolean | null>(subscribePublished, publishedSnapshot, publishedServerSnapshot);
  const saved = new Set(parseFixtureBookmarks(snapshot));
  const all = documents.length && published ? [publishedDocument,...documents] : documents;
  const items = searchLibraryFixtures(all.filter(document => saved.has(document.id)), '');
  return items.length ? <ol className="library-feed">{items.map(item => <li key={item.id}><article><p className="library-document-meta"><span>{item.publisher}</span><time dateTime={item.createdAt}>{libraryDate(item.createdAt)}</time><span>Markdown</span></p><h2><Link href={`/publications/${item.id}`}>{item.title}</Link></h2></article></li>)}</ol> : <p className="library-empty">저장한 게시물이 없습니다.</p>;
}
