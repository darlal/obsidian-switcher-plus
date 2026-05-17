// On-demand ESLint config for eslint-plugin-obsidianmd. Runs via
// `npm run lint:obsidian`. Kept separate from eslint.config.mjs so the
// CI lint path isn't gated on the plugin's (or its transitive deps')
// findings. Findings here surface as errors when run.
import obsidianmd from 'eslint-plugin-obsidianmd';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
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
      'benchmark/extra/**',
    ],
  },
  // Obsidian recommended first; typescript-eslint's recommendedTypeChecked
  // is spread AFTER it on purpose — it carries the eslintRecommended
  // overrides that turn `no-undef` off for TS (TypeScript itself catches
  // real undef; leaving the JS rule on flags every imported type).
  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // Project's parserOptions.project for type-aware rules, last so this
  // wins on merge.
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
  },
  // Jest: recommended rules, scoped to test files
  {
    files: ['src/**/*.test.ts'],
    ...jestPlugin.configs['flat/recommended'],
  },
  // Test files override (note: must come AFTER the jest spread so
  // the unbound-method swap wins on rule merge). Mirrors eslint.config.mjs.
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    },
  },
];
