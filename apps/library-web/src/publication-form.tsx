'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Button, Input, Label, NativeSelect } from '@vintad3e/ui/components';
import { formatToastText } from '@vintad3e/ui/toast-text';
import { searchFixtureMembers, type FixtureMember } from './fixture-members';

const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export function DocumentRegistrationForm() {
  const [message, setMessage] = useState('');
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('문서를 처리하지 못했습니다. 다시 시도해 주세요.');
  }
  return <form onSubmit={submit} method="post" className="library-register-form" data-hydrated={hydrated}>
    <div className="library-field"><label htmlFor="notion-url">Notion 페이지 URL</label><div className="library-field__control">
      <input aria-describedby="notion-url-help" autoComplete="url" id="notion-url" maxLength={2000} name="notionUrl" placeholder="https://www.notion.so/..." required type="url" />
      <Button aria-busy={false} variant="primary" profile="library" type="submit">문서 등록</Button>
    </div><p className="library-field__help" id="notion-url-help">Notion에서 Library 연결에 공유한 페이지 URL을 입력하세요.</p></div>
    {message ? <p className="library-form-message library-form-message--error" role="alert">{message}</p> : null}
  </form>;
}

export function PublicationForm({ members, fixtureEnabled }: { members: FixtureMember[]; fixtureEnabled: boolean }) {
  const [audience, setAudience] = useState('OWNER');
  const [readers, setReaders] = useState<FixtureMember[]>([]);
  const [options, setOptions] = useState<FixtureMember[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  function searchReaders() {
    if (!fixtureEnabled) { setMessage('직원 목록을 불러오지 못했습니다.'); return; }
    setOptions(searchFixtureMembers(members, query));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('문서를 발행하지 못했습니다.');
  }
  return <>
    <form className="publication-form" method="post" onSubmit={submit} data-hydrated={hydrated}><fieldset>
      <div className="library-field"><Label htmlFor="publication-title" appearance="native">제목</Label><Input appearance="native" id="publication-title" name="title" maxLength={180} required /></div>
      <div className="library-field"><Label htmlFor="publication-source" appearance="native">문서 파일</Label><Input appearance="native" id="publication-source" name="source" type="file" accept=".md,.html,.htm" required aria-describedby="source-limit" /><p className="library-field__help" id="source-limit">Markdown 또는 HTML, 최대 128KB</p></div>
      <div className="library-field"><Label htmlFor="publication-audience" appearance="native">열람 범위</Label><NativeSelect appearance="native" id="publication-audience" name="audience" value={audience} onChange={event => { setAudience(event.target.value); setOptions([]); }}>
        <option value="OWNER">본인만</option><option value="SELECTED">선택한 직원</option><option value="ALL_STAFF">Library 열람 권한이 있는 직원</option>
      </NativeSelect></div>
      {audience === 'SELECTED' ? <div className="library-field"><Label appearance="native" htmlFor="publication-readers">열람 직원</Label><div className="library-field__control"><Input appearance="native" id="publication-readers" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setOptions([]); }} /><Button profile="library" type="button" disabled={query.trim().length < 2} onClick={searchReaders}>직원 검색</Button></div>
        {options.length ? <ul className="publication-readers">{options.map(reader => <li key={reader.id}><Button profile="library" type="button" disabled={readers.some(selected => selected.id === reader.id) || readers.length >= 100} onClick={() => setReaders(previous => [...previous, reader])}>{reader.name} 선택</Button></li>)}</ul> : null}
        {readers.length ? <ul className="publication-readers">{readers.map(reader => <li key={reader.id}><span>{reader.name}</span><Button profile="library" variant="ghost" size="small" type="button" aria-label={`${reader.name} 열람 대상에서 제외`} onClick={() => setReaders(previous => previous.filter(selected => selected.id !== reader.id))}>제외</Button></li>)}</ul> : null}
      </div> : null}
      <div className="library-field"><Label appearance="native" htmlFor="publication-attachments">첨부 파일</Label><Input appearance="native" id="publication-attachments" type="file" name="attachments" multiple aria-describedby="attachment-limit" /><p className="library-field__help" id="attachment-limit">최대 4개, 파일당 128KB, 문서와 합계 512KB. 문서 열람자만 다운로드할 수 있습니다.</p></div>
      <div className="library-field"><Label appearance="native" htmlFor="publication-authors">작성자·기여자 (쉼표로 구분)</Label><Input appearance="native" id="publication-authors" name="humanAuthors" maxLength={1009} /></div>
      <div className="publication-fields"><div className="library-field"><Label appearance="native" htmlFor="publication-ai">사용한 AI (선택)</Label><Input appearance="native" id="publication-ai" name="aiProduct" maxLength={100} /></div><div className="library-field"><Label appearance="native" htmlFor="publication-model">모델 (알고 있는 경우)</Label><Input appearance="native" id="publication-model" name="aiModel" maxLength={100} /></div></div>
      <p className="library-field__help">기여 정보는 입력한 내용으로 표시됩니다. 발행자는 로그인한 직원으로 기록됩니다.</p>
      <Button profile="library" variant="primary" type="submit" disabled={audience === 'SELECTED' && readers.length === 0} aria-busy={false}>발행 내용 확인</Button>
    </fieldset></form>
    {message ? <div className="publication-toast publication-toast--error" role="alert"><span>{formatToastText(message)}</span><Button variant="ghost" size="small" profile="library" onClick={() => setMessage('')} aria-label="알림 닫기">×</Button></div> : null}
  </>;
}
