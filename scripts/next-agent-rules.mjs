import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const markers = ['<!-- BEGIN:nextjs-agent-rules -->', '<!-- END:nextjs-agent-rules -->', '<!-- BEGIN:nextjs-agent-feedback -->', '<!-- END:nextjs-agent-feedback -->', '<!-- NEXT-AGENTS-MD-START -->', '<!-- NEXT-AGENTS-MD-END -->'];

// Next 16.4 can write or remove its managed blocks in an app-local AGENTS.md.
// Refuse to start if such a block already exists; never rewrite the file here.
export function protectAgentRules(phase, config, configUrl, read = readFileSync) {
  if (phase !== 'phase-development-server') return config;
  let content;
  try { content = read(fileURLToPath(new URL('AGENTS.md', configUrl)), 'utf8'); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; content = ''; }
  if (markers.some(marker => content.includes(marker))) throw new Error('앱 폴더 AGENTS.md에 Next.js 관리 지침이 있어 자동 변경을 막았습니다. 해당 파일을 보존하고 직접 확인해 주세요.');
  return { ...config, agentRules: false };
}
