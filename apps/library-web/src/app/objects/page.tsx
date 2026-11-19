import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default function ObjectsPage() {
  return <main className="library-home"><section className="library-page" aria-label="파일"><Link href="/objects/new">파일 올리기</Link><p className="library-empty">파일이 없습니다.</p></section></main>;
}
