"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string };

export function LibraryReaderTools() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [bottom, setBottom] = useState(16);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".notion-document h2, .notion-document h3, .publication-content h1, .publication-content h2, .publication-content h3"));
    const items = nodes.map((node, index) => {
      if (!node.id) node.id = `library-section-${index + 1}`;
      return { id: node.id, text: node.textContent?.trim() ?? "" };
    }).filter((item) => item.text);
    const firstFrame = requestAnimationFrame(() => setHeadings(items));
    let frame = 0;
    const update = () => {
      frame = 0;
      setShowTop(window.scrollY > 100);
      const toc = document.querySelector(".library-reader-toc");
      setShowMap(Boolean(toc && toc.getBoundingClientRect().bottom < 0));
      let current = items[0]?.id ?? "";
      for (const item of items) if ((document.getElementById(item.id)?.getBoundingClientRect().top ?? Infinity) <= 160) current = item.id;
      setActive(current);
      const footerTop = document.querySelector(".public-footer")?.getBoundingClientRect().top ?? Infinity;
      setBottom(Math.max(16, window.innerHeight - footerTop + 16));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule(); window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(firstFrame); if (frame) cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);

  return <>
    {headings.length ? <details className="library-reader-toc"><summary>목차</summary><nav aria-label="목차"><ol>{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined}>{heading.text}</a></li>)}</ol></nav></details> : null}
    {headings.length ? <nav className="library-reader-minimap" aria-label="목차 바로가기" hidden={!showMap}>{headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} aria-label={heading.text} aria-current={active === heading.id ? "location" : undefined}><span className="library-reader-minimap__title">{heading.text}</span><span className="library-reader-minimap__line" aria-hidden="true" /></a>)}</nav> : null}
    <button type="button" className="library-reader-top" aria-label="맨 위로" title="맨 위로" aria-hidden={!showTop} tabIndex={showTop ? 0 : -1} data-visible={showTop} style={{ bottom }} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 11 7-7 7 7M12 4v16" /></svg></button>
  </>;
}
