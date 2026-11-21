import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const pageId = '00000000-0000-4000-8000-000000000101';
const stageId = '00000000-0000-4000-8000-000000000102';
const source = '업무를 시작하기 전에 필요한 사항을 확인합니다.';
const entry = Object.freeze({ pageId, stageId, sourceSha256: sha(source), contentSha256: sha(source) });

// Only these fixed, public examples are accepted; no imported document is read.
const examples = Object.freeze({
  single: Object.freeze({ operation: 'library.ir.import', target: 'ir-import', change: Object.freeze({ stageId, sourceSha256: entry.sourceSha256, contentSha256: entry.contentSha256 }) }),
  batch: Object.freeze({ operation: 'library.ir.batch-import', target: 'ir-import', change: Object.freeze({ attachmentManifestSha256: sha('[]'), entries: Object.freeze([entry]), manifestSha256: sha(JSON.stringify([entry])) }) }),
});

export const fixtureIrDocument = Object.freeze({ kind: 'ir', id: pageId, title: '가게 안내 기록', publisher: '직원', createdAt: '2025-12-30T00:00:00.000Z', body: source });

export function fixtureIrExample(kind) {
  return Object.hasOwn(examples, kind) ? examples[kind] : null;
}
