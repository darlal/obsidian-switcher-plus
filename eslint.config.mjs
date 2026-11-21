import jestPlugin from 'eslint-plugin-jest';
import obsidianmd from 'eslint-plugin-obsidianmd';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
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
      // Build tooling, not plugin source
      'scripts/**',
    ],
  },
  // Obsidian plugin recommended bundle. Since eslint-plugin-obsidianmd 0.6.0 it
  // carries ESLint's core recommended rules and typescript-eslint's
  // recommended(TypeChecked) configs itself, scoped to JS/TS files, so they are
  // not spread separately here: an unscoped copy reaches manifest.json/LICENSE
  // (where core rules crash ESLint) and re-enables
  // @typescript-eslint/no-misused-promises, which the bundle replaces with
  // obsidianmd/no-misused-promises (Obsidian's chaining `then` false positive).
  // validate-manifest and validate-license only run on manifest.json and
  // LICENSE, so the lint script must list those files explicitly.
  ...obsidianmd.configs.recommended,
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
      // Stricter than the bundle, which relaxes these from typescript-eslint's
      // recommendedTypeChecked defaults. Test files relax no-explicit-any
      // again in the test/mock profile below.
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/require-await': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/unbound-method': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          // Allow the `const { omitted, ...rest } = obj` property-omit idiom.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Jest: recommended rules, scoped to test files
  {
    files: ['src/**/*.test.ts'],
    ...jestPlugin.configs['flat/recommended'],
  },
  // Test files override. Must stay a SEPARATE entry that comes AFTER the jest
  // block: ESLint merges `rules` across config-array entries (later wins
  // per-rule). Folding this into the jest block does not work — a `rules` key in
  // the same object literal replaces the spread's rules wholesale, silently dropping jest's
  // entire recommended ruleset.
  {
    files: ['src/**/*.test.ts'],
    rules: {
      // you should turn the original rule off *only* for test files
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    },
  },
  // 7/21/2026: Deliberate test/mock rule profile. These type-checked rules are
  // inappropriate for test doubles: mocks and internals-poking test setup
  // legitimately use `any` and pass values the compiler sees as unsafe. Turning
  // them off here (parallel to the unbound-method override above) is what lets
  // the full bundle run on tests without contorting test doubles.
  {
    files: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/__mocks__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  // 7/21/2026: Mock files implement Obsidian component interfaces with stub
  // methods whose params exist only for signature conformance and are unused by
  // nature. `args: 'none'` allows those unused args while keeping unused
  // variables, imports, and locals flagged (real cruft is still caught).
  {
    files: ['src/__mocks__/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          args: 'none',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Prettier (must be last so it disables conflicting stylistic rules)
  { ...eslintPluginPrettierRecommended, files: ['**/*.{js,mjs,ts}'] },
];
