"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { publishedDocument, publishedSnapshot } from './fixture-published-state';

type SearchItem = { title: string; href: string; author?: string; date?: string };

export function LibrarySearchPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [author, setAuthor] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim(), period, author });
        const response = await fetch(`/api/search?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("search unavailable");
        const value: unknown = await response.json();
        if (!value || typeof value !== "object" || !("results" in value) || !Array.isArray(value.results) || !("authors" in value) || !Array.isArray(value.authors) || !("partial" in value) || typeof value.partial !== "boolean") throw new Error("invalid search response");
        const items = value.results;
        if (items.some((item: unknown) => !item || typeof item !== "object" || !("title" in item) || typeof item.title !== "string" || !("href" in item) || typeof item.href !== "string" || !/^\/(?:objects|publications)\/[a-zA-Z0-9%_-]+$/.test(item.href))) throw new Error("invalid search response");
        const days:Record<string,number>={week:7,month:30,year:365};
        const includePublished=publishedSnapshot()&&publishedDocument.title.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'))&&(!author||author===publishedDocument.publisher)&&(period==='all'||Date.parse(publishedDocument.createdAt)>=Date.now()-days[period]*86400000);
        const combined:SearchItem[]=includePublished?[{title:publishedDocument.title,href:`/publications/${publishedDocument.id}`,author:publishedDocument.publisher,date:publishedDocument.createdAt},...(items as SearchItem[])]:items as SearchItem[];
        if (!controller.signal.aborted) { setResults(combined); setAuthors(value.authors.filter((name: unknown): name is string => typeof name === "string")); setActive(combined.length ? 0 : -1); setError(false); setPartial(value.partial); setSearched(true); }
      } catch {
        if (!controller.signal.aborted) { setResults([]); setActive(-1); setError(true); setPartial(false); setSearched(true); }
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, period, author]);

  function close() {
    dialog.current?.close(); setOpen(false); setQuery(""); setPeriod("all"); setAuthor(""); setResults([]); setAuthors([]); setActive(-1); setSearched(false); setError(false); setPartial(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function resetResults() { setResults([]); setActive(-1); setSearched(false); setError(false); setPartial(false); }

  return <div className="library-search-control">
    <button ref={trigger} type="button" className="library-search-trigger" aria-label="게시물 검색" title="검색" aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); setOpen(true); requestAnimationFrame(() => input.current?.focus()); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></svg>
    </button>
    <dialog ref={dialog} className="library-search-dialog" aria-labelledby="library-search-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <h2 id="library-search-dialog-title" className="sr-only">게시물 검색</h2>
      <div className="library-search-dialog__form">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></svg>
        <input ref={input} type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetResults(); }} onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActive((index) => (index + 1) % results.length); }
          if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActive((index) => (index - 1 + results.length) % results.length); }
          if (event.key === "Enter" && active >= 0 && results[active]) { event.preventDefault(); const href = results[active].href; close(); router.push(href); }
        }} maxLength={100} placeholder="게시물 제목 검색" aria-label="게시물 제목 검색" role="combobox" aria-autocomplete="list" aria-expanded={results.length > 0} aria-controls="library-search-results" aria-activedescendant={active >= 0 ? `library-search-result-${active}` : undefined} autoComplete="off" />
        <button type="button" className="library-search-dialog__close" aria-label="검색 닫기" onClick={close}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>
      <div className="library-search-dialog__filters"><label><span>기간</span><select value={period} onChange={(event) => { setPeriod(event.target.value); resetResults(); }}><option value="all">전체 기간</option><option value="week">최근 7일</option><option value="month">최근 30일</option><option value="year">최근 1년</option></select></label><label><span>작성자</span><select value={author} onChange={(event) => { setAuthor(event.target.value); resetResults(); }}><option value="">전체 작성자</option>{authors.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>
      {error ? <p className="library-search-dialog__message" role="alert">검색 결과를 불러오지 못했습니다.</p> : null}
      {partial ? <p className="library-search-dialog__message" role="status">일부 검색 결과를 불러오지 못했습니다.</p> : null}
      {results.length ? <div className="library-search-dialog__body"><p className="library-search-dialog__caption">검색 결과</p><ul id="library-search-results" role="listbox" className="library-search-dialog__results">{results.map((item, index) => <li key={item.href} role="presentation"><Link id={`library-search-result-${index}`} role="option" aria-selected={active === index} href={item.href} onMouseEnter={() => setActive(index)} onClick={close}><svg className="library-search-dialog__document" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6" /></svg><span className="library-search-dialog__result-text"><strong>{item.title}</strong>{item.author && <small>{item.author}</small>}</span><span className="library-search-dialog__arrow" aria-hidden="true">↗</span></Link></li>)}</ul></div> : searched && !error && !partial ? <p className="library-search-dialog__message" role="status">검색 결과가 없습니다.</p> : null}
      <div className="library-search-dialog__hint"><span>↑ ↓ 이동</span><span>↵ 열기</span><span>esc 닫기</span></div>
    </dialog>
  </div>;
}
