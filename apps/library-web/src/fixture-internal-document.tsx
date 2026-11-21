import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { internalDocumentId, internalDocuments } from './internal-document-fixture';
import { fixtureOrigin, fixtureSession } from './fixture-session.mjs';
import { LibraryReaderTools } from './library-reader-tools';
import { LibraryDocumentInfo } from './library-document-info';
import { LibraryAttachmentCard } from './library-attachment-card';
import { getFixtureObject } from './fixture-object';
import { OBJECT_ID } from './fixture-object';
import { readFixtureIrAttachment, readFixtureIrImport, readFixtureNotionImport } from './fixture-ir-confirmation.mjs';
export async function FixtureInternalDocument({ kind, documentId }: { kind:'ir' | 'native'; documentId:string }) {
  const origin=fixtureOrigin(process.env); if (!origin) notFound();
  const requestHeaders=await headers(), host=requestHeaders.get('host'); if (host!==new URL(origin).host) notFound();
  const target=`/${kind}/${documentId}`; if (!fixtureSession(requestHeaders.get('cookie'),host,process.env)) redirect(`/sign-in?next=${encodeURIComponent(target)}`);
  const document=internalDocuments(process.env.NODE_ENV,process.env.VINTAD3E_LIBRARY_FIXTURE).find(item=>item.id===documentId && item.kind===kind) ?? (kind === 'ir' ? readFixtureIrImport(requestHeaders.get('cookie'), host, process.env, documentId) : readFixtureNotionImport(requestHeaders.get('cookie'), host, process.env, documentId));if(!document)notFound();
  const date=new Date(document.createdAt), short=new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(date), long=new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Seoul'}).format(date);
  const attachment = document.id === internalDocumentId ? getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, OBJECT_ID) : kind === 'ir' ? readFixtureIrAttachment(requestHeaders.get('cookie'), host, process.env, document.id) : null;
  const card = attachment && <LibraryAttachmentCard href={`/objects/${attachment.id}?documentId=${document.id}`} name={attachment.filename} size={new TextEncoder().encode(attachment.body).length} />;
  return <main className="library-home"><section className="library-page library-page--reader"><header className="library-page__header"><h1>{document.title}</h1><p className="library-reader-byline"><span>{document.publisher}</span><span aria-hidden="true">·</span> <time dateTime={document.createdAt}>{short}</time></p></header><LibraryReaderTools /><article className="publication-content"><h2>업무 시작</h2><p>{document.body}</p></article>{kind==='native' && <LibraryDocumentInfo><dl><div><dt>작성 날짜</dt><dd><time dateTime={document.createdAt}>{long}</time></dd></div></dl></LibraryDocumentInfo>}{card && (kind === 'native' ? <section><h2>첨부</h2>{card}</section> : card)}</section></main>;
}
