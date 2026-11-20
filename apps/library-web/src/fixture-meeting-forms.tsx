'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@vintad3e/ui/components';
import { ObjectUploadForm } from './records-entry-forms';
import { applyFixtureMeetingChange, readFixtureMeetingContent, type MeetingChange, type MeetingContent, type MeetingStage } from './fixture-meeting-content';
import { fixtureUpload } from './fixture-upload-spec.mjs';

const names = { TRANSCRIPT: '전사본', CORRECTED: '보정본', SUMMARY: '요약' } as const;

function FixtureMeetingChange({ change, label, meetingId, apply, done }: { change: MeetingChange | null; label: string; meetingId: string; apply: (change: MeetingChange) => boolean; done: () => void }) {
  const [proposal, setProposal] = useState<MeetingChange | null>(null);
  const [phase, setPhase] = useState<'idle' | 'proposal' | 'loaded' | 'reviewed' | 'confirmed' | 'done'>('idle');
  const [error, setError] = useState(false);
  return <section aria-busy={false}>
    {phase === 'idle' && <Button profile="library" type="button" disabled={!change} onClick={() => { if (change) { setProposal(change); setPhase('proposal'); setError(false); } }}>{label}</Button>}
    {phase === 'proposal' && <Button profile="library" type="button" onClick={() => setPhase('loaded')}>제안 불러오기</Button>}
    {proposal && ['loaded', 'reviewed', 'confirmed'].includes(phase) && <section className="staff-section"><h2>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>{label}</dd><dt>대상</dt><dd>{meetingId}</dd></dl><h3>실제 변경 데이터</h3><pre>{JSON.stringify(proposal, null, 2)}</pre></section>}
    {phase === 'loaded' && <Button profile="library" type="button" onClick={() => setPhase('reviewed')}>제안 검토</Button>}
    {phase === 'reviewed' && <Button profile="library" type="button" onClick={() => setPhase('confirmed')}>이 변경 확인</Button>}
    {phase === 'confirmed' && <Button profile="library" type="button" onClick={() => { if (!proposal || !apply(proposal)) { setError(true); return; } setError(false); setPhase('done'); done(); }}>등록</Button>}
    {phase === 'done' && <p role="status">등록했습니다.</p>}
    {error && <p role="alert">처리하지 못했습니다. 다시 시도해 주세요.</p>}
  </section>;
}

function AttachMeetingForm({ meetingId, apply }: { meetingId: string; apply: (change: MeetingChange) => boolean }) {
  const [objectId, setObjectId] = useState<string | null>(null), [cycle, setCycle] = useState(0), [proposalCycle, setProposalCycle] = useState(0);
  const change: MeetingChange | null = objectId ? { kind: 'attach', objectId } : null;
  return <section><h2>녹화·녹음 첨부</h2><ObjectUploadForm key={cycle} fixture inputId="meeting-attachment-file" onComplete={id => { setObjectId(id); setProposalCycle(value => value + 1); }} /><FixtureMeetingChange key={proposalCycle} change={change} label="회의에 첨부" meetingId={meetingId} apply={apply} done={() => { setObjectId(null); setCycle(value => value + 1); }} /></section>;
}

function MeetingStageForm({ meetingId, content, apply }: { meetingId: string; content: MeetingContent; apply: (change: MeetingChange) => boolean }) {
  const [objectId, setObjectId] = useState<string | null>(null), [cycle, setCycle] = useState(0), [proposalCycle, setProposalCycle] = useState(0);
  const [step, setStep] = useState<MeetingStage['step']>('TRANSCRIPT'), [title, setTitle] = useState(''), [source, setSource] = useState(''), [kind, setKind] = useState<MeetingStage['sourceKind']>('IMPORTED'), [parent, setParent] = useState('');
  const parents = content.stages.filter(item => item.step === (step === 'CORRECTED' ? 'TRANSCRIPT' : 'CORRECTED'));
  const selected = parents.find(item => String(item.revision) === parent)?.revision ?? null;
  const change: MeetingChange | null = objectId && title.trim() && source.trim() && (step === 'TRANSCRIPT' || selected !== null) ? { kind: 'stage', objectId, step, title: title.trim(), sourceKind: kind, sourceDetail: source.trim(), parentRevision: step === 'TRANSCRIPT' ? null : selected } : null;
  return <section><h2>회의 문서 등록</h2><ObjectUploadForm key={cycle} fixture inputId="meeting-stage-file" onComplete={id => { setObjectId(id); setProposalCycle(value => value + 1); }} />
    <label>단계 <select value={step} onChange={event => { setStep(event.target.value as MeetingStage['step']); setParent(''); }}><option value="TRANSCRIPT">전사본</option><option value="CORRECTED">보정본</option><option value="SUMMARY">요약</option></select></label>
    {step !== 'TRANSCRIPT' && <label>근거 문서 <select value={parent} onChange={event => setParent(event.target.value)}><option value="">선택</option>{parents.map(item => <option key={item.revision} value={item.revision}>{names[item.step]} · {item.revision}</option>)}</select></label>}
    <label>제목 <input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
    <label>작성 방식 <select value={kind} onChange={event => setKind(event.target.value as MeetingStage['sourceKind'])}><option value="IMPORTED">가져온 원문</option><option value="HUMAN">사람</option><option value="AI">AI</option></select></label>
    <label>출처 <input value={source} maxLength={500} onChange={event => setSource(event.target.value)} /></label>
    <FixtureMeetingChange key={proposalCycle} change={change} label="회의 문서 확인" meetingId={meetingId} apply={apply} done={() => { setObjectId(null); setCycle(value => value + 1); }} />
  </section>;
}

export function FixtureMeetingDetail({ id, title }: { id: string; title: string }) {
  const [content, setContent] = useState<MeetingContent>({ attached: false, stages: [] });
  useEffect(() => { try { const saved = readFixtureMeetingContent(sessionStorage, id); if (saved) setContent(saved); } catch {} }, [id]);
  const apply = (change: MeetingChange) => { try { const next = applyFixtureMeetingChange(sessionStorage, id, change, new Date()); if (next) { setContent(next); return true; } } catch {} return false; };
  return <main className="library-home"><article className="library-page library-page--reader"><header className="library-page__header"><h1>{title}</h1></header>
    {content.stages.map(stage => <section key={`${stage.step}-${stage.revision}`}><h2>{names[stage.step]} · {stage.revision}</h2><p>직원 · {new Date(stage.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {stage.sourceDetail}</p><Link href={`/objects/${stage.objectId}`}>{names[stage.step]} 열기</Link></section>)}
    {content.attached && <section><h2>첨부 파일</h2><ul><li><Link href={`/objects/${fixtureUpload.id}`}>{fixtureUpload.filename}</Link></li></ul></section>}
    <AttachMeetingForm meetingId={id} apply={apply} /><MeetingStageForm meetingId={id} content={content} apply={apply} />
  </article></main>;
}
