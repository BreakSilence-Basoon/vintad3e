'use client';
import { Button } from '@vintad3e/ui/components';
import { useState, type FormEvent } from 'react';
export function SignOutButton() {
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (response.ok) { window.location.assign('/sign-in'); return; }
    } catch { /* Keep the user on the existing screen on network failure. */ }
    setPending(false);
  }
  return <form onSubmit={submit}><Button aria-busy={pending} disabled={pending} variant="primary" profile="timetable" type="submit">
    <span className="form-submit-button__content"><span className="form-submit-button__measure" aria-hidden="true">다른 Google 계정으로 로그인</span><span className="form-submit-button__measure" aria-hidden="true">로그아웃 중…</span><span className="form-submit-button__visible">{pending ? '로그아웃 중…' : '다른 Google 계정으로 로그인'}</span></span>
  </Button></form>;
}
