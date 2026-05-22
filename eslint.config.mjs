import js from '@eslint/js';
import jestPlugin from 'eslint-plugin-jest';
import obsidianmd from 'eslint-plugin-obsidianmd';
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
  // 5/22/2026: Obsidian plugin recommended bundle. Note: the bundle declares
  // package.json-scoped blocks that apply the TypeScript parser to JSON;
  // do not broaden the lint glob (currently "**/*.{js,ts}") to include
  // package.json or it will fail to parse. The bundle's `validate-manifest`
  // and `validate-license` rules already run as a side-effect of JS/TS
  // linting, so no glob expansion is needed.
  ...obsidianmd.configs.recommended,
  // TypeScript: parser + plugin + recommended-type-checked rules. Spread
  // AFTER obsidian so its `eslintRecommended` carry-over turns `no-undef`
  // off for TS files (obsidian re-enables it; left on it flags every
  // imported type as undefined).
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
