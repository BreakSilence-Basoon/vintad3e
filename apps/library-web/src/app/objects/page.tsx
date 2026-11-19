import Link from 'next/link';
import { getFixtureObject, OBJECT_ID } from '../../fixture-object';
import { LibraryAttachmentCard } from '../../library-attachment-card';
export const dynamic = 'force-dynamic';
export default function ObjectsPage() {
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, OBJECT_ID);
  return <main className="library-home"><section className="library-page" aria-label="파일"><Link href="/objects/new">파일 올리기</Link>{object ? <ul className="publication-attachments"><li><LibraryAttachmentCard href={`/objects/${object.id}`} name={object.filename} size={Buffer.byteLength(object.body, 'utf8')} /></li></ul> : <p className="library-empty">파일이 없습니다.</p>}</section></main>;
}
