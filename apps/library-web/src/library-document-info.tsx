"use client";
import { useId, useState, type ReactNode } from "react";

export function LibraryDocumentInfo({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className="library-source" data-open={open}>
    <button className="library-source__trigger" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span className="library-source__title"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10.5v5M12 7.5h.01" /></svg><span>문서 정보</span></span>
      <svg className="library-source__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    <div id={id} className="library-source__expand" aria-hidden={!open} inert={!open}><div className="library-source__body">{children}</div></div>
  </section>;
}
