import { meetingIdPattern } from './fixture-meeting-storage.ts';
import { fixtureUpload, fixtureUploads } from './fixture-upload-spec.mjs';

type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type MeetingStage = { step: 'TRANSCRIPT' | 'CORRECTED' | 'SUMMARY'; revision: number; title: string; sourceKind: 'IMPORTED' | 'HUMAN' | 'AI'; sourceDetail: string; parentRevision: number | null; createdAt: string; objectId: string };
export type MeetingContent = { attached: boolean; stages: MeetingStage[] };
export type MeetingChange = { kind: 'attach'; objectId: string } | { kind: 'stage'; objectId: string; step: MeetingStage['step']; title: string; sourceKind: MeetingStage['sourceKind']; sourceDetail: string; parentRevision: number | null };
const slot = (id: string) => `vintad3e:library-meeting-content:${id}`;

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}
function validStage(value: unknown, preceding: MeetingStage[]): value is MeetingStage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as MeetingStage;
  if (Object.keys(item).sort().join(',') !== 'createdAt,objectId,parentRevision,revision,sourceDetail,sourceKind,step,title' || !fixtureUploads.some(fixture => fixture.id === item.objectId) || !['TRANSCRIPT', 'CORRECTED', 'SUMMARY'].includes(item.step) || !['IMPORTED', 'HUMAN', 'AI'].includes(item.sourceKind) || !validText(item.title, 255) || !validText(item.sourceDetail, 500) || !Number.isSafeInteger(item.revision) || item.revision !== preceding.filter(stage => stage.step === item.step).length + 1 || typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) || new Date(item.createdAt).toISOString() !== item.createdAt) return false;
  if (item.step === 'TRANSCRIPT') return item.parentRevision === null;
  return Number.isSafeInteger(item.parentRevision) && preceding.some(stage => stage.step === (item.step === 'CORRECTED' ? 'TRANSCRIPT' : 'CORRECTED') && stage.revision === item.parentRevision);
}
export function readFixtureMeetingContent(store: Store, id: string): MeetingContent | null {
  if (!meetingIdPattern.test(id)) return null;
  try {
    const raw = store.getItem(slot(id));
    if (raw === null) return { attached: false, stages: [] };
    if (raw.length > 30000) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const state = value as MeetingContent;
    if (Object.keys(state).sort().join(',') !== 'attached,stages' || typeof state.attached !== 'boolean' || !Array.isArray(state.stages) || state.stages.length > 30) return null;
    const preceding: MeetingStage[] = [];
    for (const stage of state.stages) { if (!validStage(stage, preceding)) return null; preceding.push(stage); }
    return { attached: state.attached, stages: preceding };
  } catch { return null; }
}
export function applyFixtureMeetingChange(store: Store, id: string, change: MeetingChange, now: Date): MeetingContent | null {
  const current = readFixtureMeetingContent(store, id);
  if (!current || !fixtureUploads.some(fixture => fixture.id === change.objectId) || !Number.isFinite(now.getTime())) return null;
  let next: MeetingContent;
  if (change.kind === 'attach') {
    if (current.attached || change.objectId !== fixtureUpload.id) return null;
    next = { ...current, attached: true };
  } else if (change.kind === 'stage' && current.stages.length < 30) {
    const candidate: MeetingStage = { step: change.step, revision: current.stages.filter(stage => stage.step === change.step).length + 1, title: change.title, sourceKind: change.sourceKind, sourceDetail: change.sourceDetail, parentRevision: change.parentRevision, createdAt: now.toISOString(), objectId: change.objectId };
    if (!validStage(candidate, current.stages)) return null;
    next = { ...current, stages: [...current.stages, candidate] };
  } else return null;
  try { store.setItem(slot(id), JSON.stringify(next)); return next; } catch { return null; }
}
