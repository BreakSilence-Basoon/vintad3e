'use client';
import { useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { LibraryReaderTools } from './library-reader-tools';
import { MeetingCorrectedRenderer } from './fixture-corrected-renderer';
import { parsePublicationHtml, type SafeContent } from './fixture-publication-content';

export function FixtureObjectViewer({ object, corrected = false }: { object: { id: string; filename: string }; corrected?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [nodes, setNodes] = useState<SafeContent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const url = `/api/objects/${object.id}/source`;
  async function open() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const content = await response.text();
      if (corrected && object.filename.toLowerCase().endsWith('.html')) {
        try { setNodes(parsePublicationHtml(content, object.id, [])); } catch { setNodes(null); }
      }
      setText(content);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section>
    {text === null && <Button profile="library" type="button" disabled={busy} onClick={() => void open()}>파일 열기</Button>}
    {text !== null && <><LibraryReaderTools />{nodes !== null ? <MeetingCorrectedRenderer nodes={nodes} /> : <pre className="publication-content">{text}</pre>}<a href={url} download={object.filename}>원본 다운로드</a></>}
    {error && <p role="alert">파일을 열지 못했습니다. 다시 시도해 주세요.</p>}
  </section>;
}
