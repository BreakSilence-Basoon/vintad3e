'use client';
import Link from 'next/link';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { commentSnapshot, subscribeComments } from './fixture-comments';
import { fixtureActivity } from './fixture-activity';
import { libraryDate, type FixtureDocument } from './library-fixture';
import { publishedDocument, publishedSnapshot, publishedServerSnapshot, subscribePublished } from './fixture-published-state';

export function FixtureMypage({ documents: initial }: { documents: FixtureDocument[] }) {
  const published=useSyncExternalStore<boolean | null>(subscribePublished,publishedSnapshot,publishedServerSnapshot);
  const documents=useMemo(()=>initial.length && published ? [publishedDocument,...initial] : initial,[initial,published]);
  const getSnapshot = useCallback(() => JSON.stringify(documents.map(document => commentSnapshot(document.id))), [documents]);
  const getServerSnapshot = useCallback(() => JSON.stringify(documents.map(() => '[]')), [documents]);
  const snapshot = useSyncExternalStore(subscribeComments, getSnapshot, getServerSnapshot);
  const activity = fixtureActivity(documents, JSON.parse(snapshot));
  return <>
    {documents.length ? <p>직원</p> : null}
    <section aria-labelledby="my-posts-title"><h2 id="my-posts-title">게시물</h2>
      {activity.documents.length ? <ol className="library-feed">{activity.documents.map(item => <li key={item.id}><article><p className="library-document-meta"><span>{item.publisher}</span><time dateTime={item.createdAt}>{libraryDate(item.createdAt)}</time><span>Markdown</span></p><h2><Link href={`/publications/${item.id}`}>{item.title}</Link></h2></article></li>)}</ol> : <p className="library-empty">게시한 문서가 없습니다.</p>}
    </section>
    <section aria-labelledby="my-comments-title"><h2 id="my-comments-title">댓글</h2>
      {activity.comments.length ? <ol className="library-comments">{activity.comments.map(comment => <li key={`${comment.publicationId}:${comment.id}`}><Link href={`/publications/${comment.publicationId}#comments`}>{comment.documentTitle}</Link><p>{comment.body}</p><time className="library-document-meta" dateTime={comment.createdAt}>{libraryDate(comment.createdAt)}</time></li>)}</ol> : <p className="library-empty">작성한 댓글이 없습니다.</p>}
      {activity.hasMoreComments ? <p className="library-document-meta">최근 댓글 200개를 표시합니다.</p> : null}
    </section>
  </>;
}
