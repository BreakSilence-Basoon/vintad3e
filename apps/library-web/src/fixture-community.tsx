'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@vintad3e/ui/components';
import { formatToastText } from '@vintad3e/ui/toast-text';
import { libraryDate, type FixtureDocument } from './library-fixture';

export function FixtureCommunity({ document }: { document: FixtureDocument }) {
  const [saved, setSaved] = useState(false);
  const [body, setBody] = useState('');
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  async function copy(kind: 'text' | 'reference') {
    if (pending) return;
    setPending(true);
    try {
      let text = document.body;
      if (kind === 'reference') {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(document.body));
        const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
        text = `library:${document.id}:1:sha256:${digest}`;
      }
      await navigator.clipboard.writeText(text);
      setToast({ message: kind === 'text' ? '내용을 복사했습니다.' : '문서 참조를 복사했습니다.', error: false });
    } catch { setToast({ message: '복사하지 못했습니다. 문서 접근 권한과 클립보드 권한을 확인해 주세요.', error: true }); }
    finally { setPending(false); }
  }
  function comment(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setComments(current => [{ id: crypto.randomUUID(), body: body.trim(), createdAt: new Date().toISOString() }, ...current].slice(0, 200));
    setBody(''); setToast({ message: '댓글을 작성했습니다.', error: false });
  }
  return <>
    <div className="publication-actions"><Button profile="library" type="button" disabled={pending} aria-busy={pending} onClick={() => copy('text')}>내용 복사</Button><Button profile="library" type="button" disabled={pending} aria-busy={pending} onClick={() => copy('reference')}>문서 참조 복사</Button></div>
    <section id="comments" className="publication-community" aria-labelledby="comments-title">
      <Button profile="library" type="button" aria-pressed={saved} onClick={() => { setSaved(!saved); setToast({ message: saved ? '보관함에서 해제했습니다.' : '보관함에 저장했습니다.', error: false }); }}>{saved ? '저장 해제' : '보관함 저장'}</Button>
      <h2 id="comments-title">댓글</h2><form onSubmit={comment}><fieldset><label htmlFor="publication-comment">댓글</label><textarea id="publication-comment" name="comment" value={body} onChange={event => setBody(event.target.value)} maxLength={2000} rows={3} required /><Button profile="library" type="submit" disabled={!body.trim()}>댓글 작성</Button></fieldset></form>
      {comments.length ? <ol className="library-comments">{comments.map(item => <li key={item.id}><p className="library-document-meta"><span>직원 · 나</span><time dateTime={item.createdAt}>{libraryDate(item.createdAt)}</time></p><p>{item.body}</p></li>)}</ol> : <p className="library-empty">아직 댓글이 없습니다.</p>}
    </section>
    {toast ? <div className={`publication-toast${toast.error ? ' publication-toast--error' : ''}`} role={toast.error ? 'alert' : 'status'}><span>{formatToastText(toast.message)}</span><Button variant="ghost" size="small" profile="library" onClick={() => setToast(null)} aria-label="알림 닫기">×</Button></div> : null}
  </>;
}
