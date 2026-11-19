'use client';
import { useEffect, useState } from 'react';

type Heading = { id: string; text: string };
function useActiveHeading(headings: Heading[]) {
  const [active, setActive] = useState(headings[0]?.id);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible((document.querySelector('.bedroom-mobile-contents')?.getBoundingClientRect().bottom ?? Infinity) < 0);
      let next = headings[0]?.id;
      for (const heading of headings) if ((document.getElementById(heading.id)?.getBoundingClientRect().top ?? Infinity) <= 160) next = heading.id;
      setActive(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
  }, [headings]);
  return { active, visible };
}
export function BedroomFixtureContents({ headings, label }: { headings: Heading[]; label: string }) {
  const { active } = useActiveHeading(headings);
  return <details className="bedroom-mobile-contents"><summary>{label}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></summary><nav className="bedroom-toc" aria-label={label}><ol>{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`} aria-current={active === heading.id ? 'location' : undefined} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>{heading.text}</a></li>)}</ol></nav></details>;
}
export function BedroomFixtureMiniMap({ headings, label }: { headings: Heading[]; label: string }) {
  const { active, visible } = useActiveHeading(headings);
  return <nav className="bedroom-minimap" aria-label={label} hidden={!visible}>{headings.map(heading => <a key={heading.id} href={`#${heading.id}`} aria-label={heading.text} aria-current={active === heading.id ? 'location' : undefined}><span className="bedroom-minimap-title">{heading.text}</span><span className="bedroom-minimap-line" aria-hidden="true" /></a>)}</nav>;
}
