import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const pageId = '00000000-0000-4000-8000-000000000101';
const stageId = '00000000-0000-4000-8000-000000000102';
const attachmentId = '00000000-0000-4000-8000-000000000105', uploadId = '00000000-0000-4000-8000-000000000106';
const source = '업무를 시작하기 전에 필요한 사항을 확인합니다.';
const entry = Object.freeze({ pageId, stageId, sourceSha256: sha(source), contentSha256: sha(source) });
const pageManifest = Object.freeze({ sourceSystem: 'NOTION', databaseId: '00000000-0000-4000-8000-000000000107', capturedAt: '2025-12-30T00:00:00.000Z', entries: Object.freeze([Object.freeze({ pageId, sourceSha256: entry.sourceSha256 })]) });
const file = Object.freeze({ pageId, pageSha256: entry.sourceSha256, attachmentId, ordinal: 0, size: Buffer.byteLength(source), sha256: sha(source), filename: '가게 안내.txt', contentType: 'text/plain' });
const attachmentManifest = Object.freeze({ sourceSystem: 'NOTION', databaseId: pageManifest.databaseId, capturedAt: pageManifest.capturedAt, entries: Object.freeze([file]) });

// Only these fixed, public examples are accepted; no imported document is read.
const examples = Object.freeze({
  single: Object.freeze({ operation: 'library.ir.import', target: 'ir-import', change: Object.freeze({ stageId, sourceSha256: entry.sourceSha256, contentSha256: entry.contentSha256 }) }),
  batch: Object.freeze({ operation: 'library.ir.batch-import', target: 'ir-import', change: Object.freeze({ attachmentManifestSha256: sha('[]'), entries: Object.freeze([entry]), manifestSha256: sha(JSON.stringify([entry])) }) }),
  reserve: Object.freeze({ operation: 'library.ir.reserve', target: 'ir-uploads', change: Object.freeze({ attachmentId, pageId, uploadId }) }),
  'batch-reserve': Object.freeze({ operation: 'library.ir.batch-reserve', target: 'ir-uploads', change: Object.freeze({ attachmentManifestSha256: sha(JSON.stringify(attachmentManifest)), entries: Object.freeze([Object.freeze({ attachmentId, expectedRevision: 1, pageId, uploadId })]), pageManifestSha256: sha(JSON.stringify(pageManifest)) }) }),
  attach: Object.freeze({ operation: 'library.ir.attach', target: 'ir-attachments', change: Object.freeze({ attachmentId, expectedRevision: 1, objectId: '00000000-0000-4000-8000-000000000009', pageId }) }),
  delete: Object.freeze({ operation: 'library.content.lifecycle', target: 'content-lifecycle', change: Object.freeze({ action: 'delete', id: pageId, kind: 'document', revision: 1 }) }),
  restore: Object.freeze({ operation: 'library.content.lifecycle', target: 'content-lifecycle', change: Object.freeze({ action: 'restore', id: pageId, kind: 'document', revision: 2 }) }),
});

export const fixtureIrDocument = Object.freeze({ kind: 'ir', id: pageId, title: '가게 안내 기록', publisher: '직원', createdAt: '2025-12-30T00:00:00.000Z', body: source });
export const fixtureIrManifests = Object.freeze({ page: pageManifest, attachments: attachmentManifest });

export function fixtureIrExample(kind) {
  return Object.hasOwn(examples, kind) ? examples[kind] : null;
}
