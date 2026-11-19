'use client';
import { useEffect, useState } from 'react';
import { showStaffToast } from '@vintad3e/ui/toast';
import { readRegistrations, writeRegistration } from './sns-fixture-storage';

export function RegisterToggle({ reportId, registered, readOnly = false }: { reportId: string; registered: boolean; readOnly?: boolean }) {
  const [value, setValue] = useState(registered);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const data = readRegistrations(sessionStorage); if (data && Object.hasOwn(data, reportId)) setValue(data[reportId]); else setValue(registered); } catch { setValue(registered); } setLoaded(true); }, [registered, reportId]);
  function toggle() {
    if (readOnly || !loaded) return;
    const next = !value;
    try { if (writeRegistration(sessionStorage, reportId, next)) { setValue(next); return; } } catch {}
    showStaffToast('등록 결과를 확인하지 못했습니다.\n잠시 후 상태를 확인해 주세요.', 'error');
  }
  return <div className="register-toggle"><button type="button" onClick={toggle} disabled={!loaded || readOnly} aria-label={readOnly ? (value ? '등록된 게시물' : '등록 전 게시물') : value ? '게시물 등록 해제' : '게시물 등록'} aria-pressed={value} data-confirmed-registered={value ? 'true' : 'false'} className={`shortage-save-button register-toggle-button${value ? ' is-registered' : ''}`} title={readOnly ? (value ? '등록됨' : '등록 전') : value ? '등록 해제' : '등록'}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3.5h11.1L20.5 8v12.5H3.5v-17H5Zm1.5 2v5h9v-5h-9Zm11 13v-8.7l-2.8-2.8H14v5H5.5v6.5h2.3v-4.2h8.4v4.2h1.3Zm-8.2 0h5.4v-2.7H9.3v2.7Z" /></svg></button></div>;
}
