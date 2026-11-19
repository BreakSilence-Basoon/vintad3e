import { protectAgentRules } from '../../scripts/next-agent-rules.mjs';

/** @type {import('next').NextConfig} */
const config = { transpilePackages: ['@vintad3e/ui'] };
export default phase => protectAgentRules(phase, config, import.meta.url);
