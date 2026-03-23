import { createRequire } from 'module';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const require = createRequire(import.meta.url);
const nextjsConfig = require('eslint-config/nextjs');

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Shared TypeScript + import rules (excluding Next-specific ones to avoid conflicts)
  ...nextjsConfig.filter((c) => !c.plugins?.['@typescript-eslint'] && !c.languageOptions?.parser),
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'coverage/**',
  ]),
]);

export default eslintConfig;
