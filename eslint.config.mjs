import js from '@eslint/js';
import jestPlugin from 'eslint-plugin-jest';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      '*.config.js',
      '.eslintrc.js',
      '.prettierrc.js',
      'coverage/**',
      'demo/**',
      'dist/**',
      'node_modules/**',
      'support/demo_template/sample.js',
      'benchmark/**',
    ],
  },
  // ESLint core recommended
  js.configs.recommended,
  // TypeScript: parser + plugin + recommended-type-checked rules
  ...tseslint.configs.recommendedTypeChecked,
  // Main TypeScript configuration: scope parserOptions.project to .ts/.tsx
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/unbound-method': 'error',
      // Enabled to keep parity with eslint.obsidian.config.mjs so that
      // inline `eslint-disable @typescript-eslint/no-deprecated` directives
      // in test files aren't flagged as unused by `npm run lint`.
      '@typescript-eslint/no-deprecated': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Jest: recommended rules, scoped to test files
  {
    files: ['src/**/*.test.ts'],
    ...jestPlugin.configs['flat/recommended'],
  },
  // Test files override (note: must come AFTER the jest spread so
  // the unbound-method swap wins on rule merge)
  {
    files: ['src/**/*.test.ts'],
    rules: {
      // you should turn the original rule off *only* for test files
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    },
  },
  // Prettier (must be last so it disables conflicting stylistic rules)
  eslintPluginPrettierRecommended,
];
