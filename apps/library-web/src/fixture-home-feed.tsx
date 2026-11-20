'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { publishedDocument, publishedSnapshot, publishedServerSnapshot, subscribePublished } from './fixture-published-state';
type Item={id:string;title:string;href:string;publisher:string;publishedAt:string};
export function FixtureHomeFeed({items,query,fixture}:{items:Item[];query:string;fixture:boolean}) {
 const published=useSyncExternalStore<boolean | null>(subscribePublished,publishedSnapshot,publishedServerSnapshot);
 const matches=fixture&&published&&publishedDocument.title.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'));
 const list=matches?[{id:publishedDocument.id,title:publishedDocument.title,href:`/publications/${publishedDocument.id}`,publisher:publishedDocument.publisher,publishedAt:publishedDocument.createdAt},...items].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id)):items;
 const format=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Seoul'});
 return list.length?<ol className="library-feed">{list.map(item=><li key={item.id}><article className="library-post"><h2 className="library-post__title"><Link href={item.href}>{item.title}</Link></h2><div className="library-post__byline"><time dateTime={item.publishedAt}>{format.format(new Date(item.publishedAt))}</time>{item.publisher&&item.publisher!=='Notion'?<><span className="library-post__separator" aria-hidden="true">·</span><span className="library-post__author">{item.publisher}</span></>:null}</div></article></li>)}</ol>:<p className="library-empty">{query?'검색 결과가 없습니다.':'아직 게시물이 없습니다.'}</p>;
}
