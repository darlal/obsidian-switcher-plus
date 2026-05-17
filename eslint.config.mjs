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
      'benchmark/extra/**',
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
        ecmaVersion: 2020,
        sourceType: 'module',
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
