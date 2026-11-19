'use client';
import { useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { ObjectUploadForm } from './records-entry-forms';

export function AttachMeetingForm() {
  return <section><h2>녹화·녹음 첨부</h2><ObjectUploadForm /><section aria-busy={false}><Button profile="library" type="button" disabled>회의에 첨부</Button></section></section>;
}

export function MeetingStageForm() {
  const [step, setStep] = useState('TRANSCRIPT');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [kind, setKind] = useState('IMPORTED');
  return <section><h2>회의 문서 등록</h2><ObjectUploadForm />
    <label>단계 <select value={step} onChange={event => setStep(event.target.value)}><option value="TRANSCRIPT">전사본</option><option value="CORRECTED">보정본</option><option value="SUMMARY">요약</option></select></label>
    {step !== 'TRANSCRIPT' && <label>근거 문서 <select value="" onChange={() => {}}><option value="">선택</option></select></label>}
    <label>제목 <input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
    <label>작성 방식 <select value={kind} onChange={event => setKind(event.target.value)}><option value="IMPORTED">가져온 원문</option><option value="HUMAN">사람</option><option value="AI">AI</option></select></label>
    <label>출처 <input value={source} maxLength={500} onChange={event => setSource(event.target.value)} /></label>
    <section aria-busy={false}><Button profile="library" type="button" disabled>회의 문서 확인</Button></section>
  </section>;
}
