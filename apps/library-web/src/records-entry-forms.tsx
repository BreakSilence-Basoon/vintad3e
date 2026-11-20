'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button, Input, Label } from '@vintad3e/ui/components';
import { useRouter } from 'next/navigation';
import { addSyntheticMeeting } from './fixture-meeting-storage';
import { fixtureUpload, fixtureUploads } from './fixture-upload-spec.mjs';
import Link from 'next/link';

const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export function CreateMeetingForm({ fixture = false }: { fixture?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  return <section data-hydrated={hydrated}><Label htmlFor="meeting-title" appearance="native">회의 제목</Label><Input id="meeting-title" appearance="native" value={title} maxLength={255} onChange={event => setTitle(event.target.value)} />
    <section aria-busy={false}><Button profile="library" type="button" disabled={!title.trim()} onClick={() => { if (fixture) { try { const id = crypto.randomUUID(); if (addSyntheticMeeting(sessionStorage, { id, title: title.trim() })) { router.push(`/meetings/${id}`); return; } } catch {} } setError(true); }}>회의 기록 만들기</Button>{error && <p role="alert">처리하지 못했습니다. 다시 시도해 주세요.</p>}</section>
  </section>;
}

export function ObjectUploadForm({ fixture = false, inputId = 'library-object-file', onComplete, includeCorrected = false }: { fixture?: boolean; inputId?: string; onComplete?: (id: string) => void; includeCorrected?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const selected = file ? (includeCorrected ? fixtureUploads : [fixtureUpload]).find(item => item.filename === file.name && new TextEncoder().encode(item.body).length === file.size) : undefined;
  const [stage, setStage] = useState<'select' | 'proposal' | 'loaded' | 'reviewed' | 'confirmed' | 'approved' | 'uploaded'>('select');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  async function prepare() {
    if (!fixture || !file || !selected) { setError(true); return; }
    setBusy(true); setError(false);
    try { if (await file.text() !== selected.body) throw new Error('invalid'); setStage('proposal'); } catch { setError(true); } finally { setBusy(false); }
  }
  async function upload() {
    if (!file || !selected || busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch('/api/fixture/upload', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file });
      const result = response.ok ? await response.json() : null;
      if (result?.id !== selected.id) throw new Error('unavailable');
      setStage('uploaded');
      onComplete?.(result.id);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section className="library-register" aria-label="파일 올리기" aria-busy={busy} data-hydrated={hydrated}>
    <div className="library-field"><Label htmlFor={inputId} appearance="native">파일</Label><Input id={inputId} appearance="native" type="file" disabled={busy || stage !== 'select'} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(false); }} /></div>
    {stage === 'select' && <Button profile="library" type="button" disabled={!file || busy} onClick={() => void prepare()}>업로드 내용 확인</Button>}
    {stage === 'proposal' && <Button profile="library" type="button" onClick={() => setStage('loaded')}>제안 불러오기</Button>}
    {['loaded', 'reviewed', 'confirmed'].includes(stage) && <section className="staff-section" aria-labelledby={`${inputId}-summary`}><h2 id={`${inputId}-summary`}>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>파일 올리기</dd><dt>대상</dt><dd>{selected?.filename}</dd></dl></section>}
    {stage === 'loaded' && <Button profile="library" type="button" onClick={() => setStage('reviewed')}>제안 검토</Button>}
    {stage === 'reviewed' && <Button profile="library" type="button" onClick={() => setStage('confirmed')}>이 변경 확인</Button>}
    {stage === 'confirmed' && <Button profile="library" type="button" onClick={() => setStage('approved')}>업로드 승인</Button>}
    {stage === 'approved' && <Button profile="library" type="button" disabled={busy} onClick={() => void upload()}>파일 올리기</Button>}
    {stage === 'uploaded' && selected && <><p role="status">파일을 올렸습니다.</p><Link href={`/objects/${selected.id}`}>파일 열기</Link></>}
    {error && <p role="alert">처리하지 못했습니다. 다시 시도해 주세요.</p>}
  </section>;
}
