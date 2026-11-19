import test from 'node:test';
import assert from 'node:assert/strict';
import { protectAgentRules } from './next-agent-rules.mjs';

const url = import.meta.url;
const config = { transpilePackages: ['@vintad3e/ui'] };
test('development disables automatic agent rules without altering unrelated instructions', () => {
  assert.deepEqual(protectAgentRules('phase-development-server', config, url, () => '# Custom instructions'), { ...config, agentRules: false });
  assert.deepEqual(protectAgentRules('phase-development-server', config, url, () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); }), { ...config, agentRules: false });
});
test('existing Next-managed blocks are preserved and unreadable files stop startup', () => {
  for (const marker of ['<!-- BEGIN:nextjs-agent-rules -->', '<!-- END:nextjs-agent-rules -->', '<!-- BEGIN:nextjs-agent-feedback -->', '<!-- END:nextjs-agent-feedback -->', '<!-- NEXT-AGENTS-MD-START -->', '<!-- NEXT-AGENTS-MD-END -->']) {
    assert.throws(() => protectAgentRules('phase-development-server', config, url, () => `custom\n${marker}`), /자동 변경을 막았습니다/);
  }
  assert.throws(() => protectAgentRules('phase-development-server', config, url, () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); }), /denied/);
  assert.equal(protectAgentRules('phase-production-build', config, url, () => { throw new Error('must not read'); }), config);
});
