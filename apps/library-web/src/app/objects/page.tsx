import Link from 'next/link';
import { getFixtureObject, OBJECT_ID } from '../../fixture-object';
import { LibraryAttachmentCard } from '../../library-attachment-card';
import { headers } from 'next/headers';
import { getFixtureUpload } from '../../fixture-upload.mjs';
export const dynamic = 'force-dynamic';
export default async function ObjectsPage() {
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, OBJECT_ID);
  const requestHeaders = await headers();
  const upload = getFixtureUpload(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env);
  const objects = [object, upload].filter(item => item !== null);
  return <main className="library-home"><section className="library-page" aria-label="파일"><Link href="/objects/new">파일 올리기</Link>{objects.length ? <ul className="publication-attachments">{objects.map(item => <li key={item.id}><LibraryAttachmentCard href={`/objects/${item.id}`} name={item.filename} size={Buffer.byteLength(item.body, 'utf8')} /></li>)}</ul> : <p className="library-empty">파일이 없습니다.</p>}</section></main>;
}
