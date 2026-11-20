'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Button } from '@vintad3e/ui/components';
import { ObjectUploadForm } from './records-entry-forms';
import { applyFixtureMeetingChange, readFixtureMeetingContent, type MeetingChange, type MeetingContent, type MeetingStage } from './fixture-meeting-content';
import { fixtureUpload } from './fixture-upload-spec.mjs';
import { confirmationPayloadText, escapeConfirmationText } from './fixture-confirmation-display';
import { fixtureMeetingDocumentId } from './fixture-meeting-document';

const names = { TRANSCRIPT: '전사본', CORRECTED: '보정본', SUMMARY: '요약' } as const;
type Proposal = { proposalId: string; meetingId: string; change: MeetingChange; canonical: string; changeDigest: string; permissionDigest: string; checkedAt: number; expiresAt: number; state: 'proposal' | 'loaded' | 'reviewed' | 'confirmed' | 'executed' };
const date = (time: number) => new Date(time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const preStyle: CSSProperties = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '28rem', overflow: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 8px)' };

function FixtureMeetingChange({ change, label, meetingId, apply, done }: { change: MeetingChange | null; label: string; meetingId: string; apply: (change: MeetingChange) => boolean; done: () => void }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [phase, setPhase] = useState<'idle' | 'proposal' | 'loaded' | 'reviewed' | 'confirmed' | 'done'>('idle');
  const [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const active = useRef(false);
  async function transition(action: 'prepare' | 'load' | 'review' | 'confirm' | 'execute') {
    if (active.current || (action === 'prepare' ? !change : !proposal)) return;
    active.current = true; setBusy(true); setError(false);
    try {
      const payload = action === 'prepare' ? { action, meetingId, change } : { action, proposalId: proposal!.proposalId, changeDigest: proposal!.changeDigest };
      const response = await fetch('/api/fixture/meeting-confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const value = await response.json() as Proposal;
      const expected = action === 'prepare' ? change : proposal!.change;
      const expectedState = { prepare: 'proposal', review: 'reviewed', confirm: 'confirmed', execute: 'executed' } as const;
      if (!value || value.meetingId !== meetingId || !/^[0-9a-f-]{36}$/.test(value.proposalId) || !/^[a-f0-9]{64}$/.test(value.changeDigest) || !/^[a-f0-9]{64}$/.test(value.permissionDigest) || value.canonical !== JSON.stringify(expected) || JSON.stringify(value.change) !== value.canonical || !Number.isFinite(value.checkedAt) || !Number.isFinite(value.expiresAt) || !['proposal', 'loaded', 'reviewed', 'confirmed', 'executed'].includes(value.state) || (action !== 'load' && value.state !== expectedState[action]) || (action === 'load' && value.state === 'proposal') || (proposal && (value.proposalId !== proposal.proposalId || value.changeDigest !== proposal.changeDigest || value.permissionDigest !== proposal.permissionDigest))) throw new Error('invalid proposal');
      setProposal(value);
      if (action === 'execute') { if (!apply(value.change)) throw new Error('storage unavailable'); setPhase('done'); done(); }
      else setPhase(value.state === 'executed' ? 'confirmed' : value.state);
    } catch { setError(true); } finally { active.current = false; setBusy(false); }
  }
  return <section aria-busy={busy}>
    {phase === 'idle' && <Button profile="library" type="button" disabled={!change || busy} onClick={() => void transition('prepare')}>{label}</Button>}
    {proposal && phase !== 'done' && <Button profile="library" type="button" disabled={busy} onClick={() => void transition('load')}>{phase === 'proposal' ? '제안 불러오기' : '최신 상태 다시 불러오기'}</Button>}
    {proposal && ['loaded', 'reviewed', 'confirmed'].includes(phase) && <section className="staff-section"><h2>제안 내용</h2><dl><dt>앱</dt><dd>Library</dd><dt>작업</dt><dd>library.meeting.write</dd><dt>대상</dt><dd style={{ overflowWrap: 'anywhere' }}>library:meetings</dd><dt>제안 번호</dt><dd>{proposal.proposalId}</dd><dt>제안 만료</dt><dd>{date(proposal.expiresAt)} (한국 시간){proposal.expiresAt <= Date.now() ? ' · 만료됨' : ''}</dd><dt>현재 권한</dt><dd>이 대상의 작업 권한 확인됨 · {date(proposal.checkedAt)} (한국 시간)</dd><dt>처리 상태</dt><dd role="status">{phase === 'confirmed' ? '확인됨 · 아직 실행되지 않음' : '확인 대기'}</dd><dt>제안 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>{proposal.changeDigest}</dd><dt>권한 digest</dt><dd style={{ overflowWrap: 'anywhere' }}>{proposal.permissionDigest}</dd></dl><p>보이지 않는 문자는 {'\\uXXXX'} 또는 {'\\u{XXXXX}'}, 원래 역슬래시는 {'\\\\'}로 표시합니다. 검증에 사용하는 원문과 digest는 바꾸지 않습니다.</p><h3>실제 변경 데이터</h3><pre style={preStyle}>{confirmationPayloadText(proposal.change)}</pre><h3>서버에 저장된 제안 원문</h3><pre style={preStyle}>{escapeConfirmationText(proposal.canonical)}</pre></section>}
    {phase === 'loaded' && <Button profile="library" type="button" disabled={busy} onClick={() => void transition('review')}>제안 검토</Button>}
    {phase === 'reviewed' && <Button profile="library" type="button" disabled={busy} onClick={() => void transition('confirm')}>이 변경 확인</Button>}
    {phase === 'confirmed' && <Button profile="library" type="button" disabled={busy || proposal!.expiresAt <= Date.now()} onClick={() => void transition('execute')}>등록</Button>}
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
  return <section><h2>회의 문서 등록</h2><ObjectUploadForm key={cycle} includeCorrected fixture inputId="meeting-stage-file" onComplete={id => { setObjectId(id); setProposalCycle(value => value + 1); }} />
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
    {content.stages.map(stage => <section key={`${stage.step}-${stage.revision}`}><h2>{names[stage.step]} · {stage.revision}</h2><p>직원 · {new Date(stage.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {stage.sourceDetail}</p><Link href={`/objects/${stage.objectId}?documentId=${fixtureMeetingDocumentId}${stage.step === 'CORRECTED' ? '&view=corrected' : ''}`}>{names[stage.step]} 열기</Link></section>)}
    {content.attached && <section><h2>첨부 파일</h2><ul><li><Link href={`/objects/${fixtureUpload.id}`}>{fixtureUpload.filename}</Link></li></ul></section>}
    <AttachMeetingForm meetingId={id} apply={apply} /><MeetingStageForm meetingId={id} content={content} apply={apply} />
  </article></main>;
}
