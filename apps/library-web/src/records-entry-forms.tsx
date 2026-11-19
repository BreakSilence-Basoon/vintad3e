'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button, Input, Label } from '@vintad3e/ui/components';

const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export function CreateMeetingForm() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  return <section data-hydrated={hydrated}><Label htmlFor="meeting-title" appearance="native">회의 제목</Label><Input id="meeting-title" appearance="native" value={title} maxLength={255} onChange={event => setTitle(event.target.value)} />
    <section aria-busy={false}><Button profile="library" type="button" disabled={!title.trim()} onClick={() => setError(true)}>회의 기록 만들기</Button>{error && <p role="alert">처리하지 못했습니다. 다시 시도해 주세요.</p>}</section>
  </section>;
}

export function ObjectUploadForm() {
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  return <section className="library-register" aria-label="파일 올리기" aria-busy={false} data-hydrated={hydrated}>
    <div className="library-field"><Label htmlFor="library-object-file" appearance="native">파일</Label><Input id="library-object-file" appearance="native" type="file" onChange={event => setSelected(Boolean(event.target.files?.[0]))} /></div>
    <Button profile="library" type="button" disabled={!selected} onClick={() => setError(true)}>업로드 내용 확인</Button>
    {error && <p role="alert">처리하지 못했습니다. 다시 시도해 주세요.</p>}
  </section>;
}
