import Link from "next/link";

export function LibraryAttachmentCard({ href, name, size }: { href: string; name: string; size: number }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = ext === "md" ? "Markdown" : ext === "m4a" || ext === "mp3" || ext === "wav" ? "오디오" : ext === "html" || ext === "htm" ? "HTML" : ext ? ext.toUpperCase() : "파일";
  const sizeLabel = size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return <Link className="library-attachment-card" href={href}>
    <span className="library-attachment-card__icon" aria-hidden="true">{type === "오디오" ? <svg viewBox="0 0 24 24"><path d="M9 18V5l9-2v13M9 18c0 1.7-1.2 3-2.8 3S3.5 20 3.5 18.7 4.7 16.5 6.3 16.5c1.1 0 2 .5 2.7 1.5ZM18 16c0 1.7-1.2 3-2.8 3s-2.7-1-2.7-2.3 1.2-2.2 2.8-2.2c1.1 0 2 .5 2.7 1.5Z"/></svg> : <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>}</span>
    <span className="library-attachment-card__text"><span className="library-attachment-card__name">{name}</span><span className="library-attachment-card__meta">{type} <span aria-hidden="true">·</span> {sizeLabel}</span></span>
    <svg className="library-attachment-card__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
  </Link>;
}
