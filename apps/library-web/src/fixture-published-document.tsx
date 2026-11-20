'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@vintad3e/ui/components';
import { archivePublished, publishedDocument, publishedSnapshot, publishedServerSnapshot, subscribePublished } from './fixture-published-state';
import { LibraryDocumentInfo } from './library-document-info';
import { LibraryReaderTools } from './library-reader-tools';
import { FixtureCommunity } from './fixture-community';

export function FixturePublishedDocument() {
  const router=useRouter(); const [error,setError]=useState(false);
  const published = useSyncExternalStore<boolean | null>(subscribePublished, publishedSnapshot, publishedServerSnapshot);
  if (published === null) return null;
  if (!published) return <main className="library-home"><section className="library-page"><p>문서를 찾을 수 없습니다.</p><Link href="/">홈</Link></section></main>;
  return <main className="library-home"><section className="library-page library-page--reader"><header className="library-page__header"><h1>{publishedDocument.title}</h1><p className="library-reader-byline"><span>{publishedDocument.publisher}</span><span aria-hidden="true">·</span> {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(publishedDocument.createdAt))}</p></header><LibraryReaderTools /><article className="publication-content"><p>{publishedDocument.body}</p></article><LibraryDocumentInfo><dl><div><dt>형식</dt><dd>Markdown</dd></div><div><dt>등록 날짜</dt><dd><time dateTime={publishedDocument.createdAt}>{new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(publishedDocument.createdAt))}</time></dd></div></dl></LibraryDocumentInfo><div className="publication-actions"><a href={`data:text/plain;charset=utf-8,${encodeURIComponent(publishedDocument.body)}`} download="업무 안내.md">원본 다운로드</a><Button profile="library" type="button" onClick={()=>{if(archivePublished()){router.push('/mypage');router.refresh();}else setError(true);}}>목록에서 제외</Button></div><FixtureCommunity document={publishedDocument} />{error&&<div className="publication-toast publication-toast--error" role="alert"><span>문서를 목록에서 제외하지 못했습니다.</span><Button variant="ghost" size="small" profile="library" onClick={()=>setError(false)} aria-label="알림 닫기">×</Button></div>}</section></main>;
}
