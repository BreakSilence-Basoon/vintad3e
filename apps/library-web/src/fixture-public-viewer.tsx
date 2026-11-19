'use client';
import { useState } from 'react';
import { Button } from '@vintad3e/ui/components';

export function FixturePublicViewer({ kind, id }: { kind: 'objects' | 'documents'; id: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const url = `/api/public/${kind}/${id}/source`;
  async function open() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch(url, { cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('unavailable');
      setContent(await response.text());
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section>{content === null && <Button profile="library" type="button" disabled={busy} onClick={() => void open()}>파일 열기</Button>}
    {content !== null && <><pre className="publication-content">{content}</pre><a href={url}>원본 열기</a></>}
    {error && <p role="alert">파일을 열지 못했습니다. 다시 시도해 주세요.</p>}
  </section>;
}
