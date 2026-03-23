import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const nestjsConfig = require('eslint-config/nestjs');
const tsParser = require('@typescript-eslint/parser');

export default [
  ...nestjsConfig.map((config) => {
    if (config.languageOptions?.parser || config.files) {
      return {
        ...config,
        languageOptions: {
          ...config.languageOptions,
          parser: tsParser,
          parserOptions: {
            project: './tsconfig.json',
            tsconfigRootDir: __dirname,
          },
        },
      };
    }
    return config;
  }),
];
