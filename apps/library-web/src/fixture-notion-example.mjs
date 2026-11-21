import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const title = '가게 안내 기록', source = '업무를 시작하기 전에 필요한 사항을 확인합니다.';
const stageId = '00000000-0000-4000-8000-000000000103';
const envelope = JSON.stringify({ title, body: source });
export const fixtureNotionDocument = Object.freeze({ kind: 'ir', id: '00000000-0000-4000-8000-000000000104', title, publisher: '직원', createdAt: '2025-12-30T00:00:00.000Z', body: source });
export const fixtureNotionExample = Object.freeze({ operation: 'library.notion.import', target: 'notion-import', change: Object.freeze({ stageId, sourceSha256: sha(source), envelopeSha256: sha(envelope), title }) });
