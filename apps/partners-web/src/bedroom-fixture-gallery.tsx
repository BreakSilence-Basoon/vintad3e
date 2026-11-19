'use client';
import { useRef, useState } from 'react';

const illustration = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#eeece8"/><rect x="120" y="80" width="560" height="340" fill="#d7d3cd"/><circle cx="400" cy="250" r="112" fill="#b9b4ae"/></svg>')}`;
const labels = {
  ko: { image: '사진 크게 보기', space: 'proj. bedroom 전시 자료', previous: '이전 사진', next: '다음 사진', close: '닫기' },
  en: { image: 'View full-size image', space: 'proj. bedroom exhibition material', previous: 'Previous image', next: 'Next image', close: 'Close' },
  ja: { image: '画像を大きく表示', space: 'proj. bedroom 展示資料', previous: '前の画像', next: '次の画像', close: '閉じる' },
};

function BedroomFixtureZoom({ language, alt }: { language: keyof typeof labels; alt: string }) {
  const text = language === 'ko' ? { in: '확대', out: '축소', fit: '화면에 맞추기' } : language === 'ja' ? { in: '拡大', out: '縮小', fit: '画面に合わせる' } : { in: 'Zoom in', out: 'Zoom out', fit: 'Fit to screen' };
  const picture = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [baseWidth, setBaseWidth] = useState(0);
  const change = (target: number) => {
    if (zoom === 1 && picture.current) setBaseWidth(picture.current.getBoundingClientRect().width);
    setZoom(Math.max(1, Math.min(4, target)));
  };
  return <><div className="bedroom-zoom-controls"><button type="button" aria-label={text.out} title={text.out} disabled={zoom === 1} onClick={() => change(zoom - 1)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14" /></svg></button><button type="button" className="bedroom-zoom-fit" aria-label={text.fit} title={text.fit} onClick={() => change(1)}>{zoom * 100}%</button><button type="button" aria-label={text.in} title={text.in} disabled={zoom === 4} onClick={() => change(zoom + 1)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5v14" /></svg></button></div><div className="bedroom-zoom-stage"><button type="button" className="bedroom-zoom-picture" aria-label={zoom === 1 ? text.in : text.fit} onClick={() => change(zoom === 1 ? 2 : 1)} data-zoomed={zoom > 1} style={zoom > 1 ? { width: baseWidth * zoom, maxWidth: 'none' } : undefined}><img ref={picture} src={illustration} width="800" height="500" alt={alt} /></button></div></>;
}

export function BedroomFixtureGallery({ language, count }: { language: keyof typeof labels; count: number }) {
  const text = labels[language];
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(0);
  const [opening, setOpening] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(count - 1, target));
    const item = track.current?.children[next] as HTMLElement | undefined;
    if (item && track.current) track.current.scrollTo({ left: item.offsetLeft - (track.current.firstElementChild as HTMLElement).offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    setIndex(next);
  };
  return <div className={`bedroom-gallery${count > 1 ? ' bedroom-gallery-multiple' : ''}`}>
    <div className="bedroom-image-track" ref={track} role="region" aria-label={text.space} onScroll={event => {
      const children = Array.from(event.currentTarget.children) as HTMLElement[];
      if (!children.length) return;
      const left = event.currentTarget.scrollLeft;
      let closest = 0;
      children.forEach((child, i) => { if (Math.abs(child.offsetLeft - children[0].offsetLeft - left) < Math.abs(children[closest].offsetLeft - children[0].offsetLeft - left)) closest = i; });
      setIndex(closest);
    }}>{Array.from({ length: count }, (_, i) => <figure key={i}><button type="button" aria-label={`${text.image} (${i + 1}/${count})`} onClick={() => { setExpanded(i); setOpening(value => value + 1); dialog.current?.showModal(); }}><img src={illustration} width="800" height="500" alt={text.space} /></button></figure>)}</div>
    {count > 1 && <div className="bedroom-gallery-controls"><span className="bedroom-gallery-count" aria-live="polite">{index + 1} / {count}</span><div className="bedroom-gallery-dots">{Array.from({ length: count }, (_, i) => <button type="button" key={i} aria-label={`${text.space} (${i + 1}/${count})`} aria-current={index === i ? 'true' : undefined} onClick={() => goTo(i)}><span /></button>)}</div><div className="bedroom-gallery-arrows"><button type="button" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label={text.previous}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m14 6-6 6 6 6" /></svg></button><button type="button" disabled={index === count - 1} onClick={() => goTo(index + 1)} aria-label={text.next}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10 6 6 6-6 6" /></svg></button></div></div>}
    <dialog ref={dialog} className="bedroom-lightbox" aria-label={text.image} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}><div className="bedroom-lightbox-content"><div className="bedroom-lightbox-toolbar"><span>{expanded + 1} / {count}</span><button type="button" onClick={() => dialog.current?.close()} aria-label={text.close}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div><BedroomFixtureZoom key={`${expanded}-${opening}`} language={language} alt={text.space} />{count > 1 && <div className="bedroom-lightbox-arrows"><button type="button" disabled={expanded === 0} onClick={() => setExpanded(expanded - 1)} aria-label={text.previous}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m14 6-6 6 6 6" /></svg></button><button type="button" disabled={expanded === count - 1} onClick={() => setExpanded(expanded + 1)} aria-label={text.next}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10 6 6 6-6 6" /></svg></button></div>}</div></dialog>
  </div>;
}
