import { plugin as shadcn } from '@shadcn/lint';
import parser from '@typescript-eslint/parser';
import { createSharedUiConfig } from './policy.mjs';

export const sharedUiConfig = createSharedUiConfig(shadcn, parser);
export default sharedUiConfig;
