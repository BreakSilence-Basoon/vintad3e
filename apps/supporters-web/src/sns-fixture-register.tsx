'use client';

export function RegisterToggle({ registered }: { reportId: string; registered: boolean; readOnly?: boolean }) {
  return <div className="register-toggle"><button type="button" disabled aria-label={registered ? '등록된 게시물' : '등록 전 게시물'} aria-pressed={registered} data-confirmed-registered={registered ? 'true' : 'false'} className={`shortage-save-button register-toggle-button${registered ? ' is-registered' : ''}`} title={registered ? '등록됨' : '등록 전'}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3.5h11.1L20.5 8v12.5H3.5v-17H5Zm1.5 2v5h9v-5h-9Zm11 13v-8.7l-2.8-2.8H14v5H5.5v6.5h2.3v-4.2h8.4v4.2h1.3Zm-8.2 0h5.4v-2.7H9.3v2.7Z" /></svg></button></div>;
}
