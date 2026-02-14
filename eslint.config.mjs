import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintConfigPrettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Used heavily with WebGL/DOM APIs — warn instead of error
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Allow _-prefixed unused params (already used in the codebase)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Encourage import type where possible
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // Warn on explicit any rather than hard-error
      '@typescript-eslint/no-explicit-any': 'warn',

      // Entity system uses empty methods as override points (check, collideWith, ready, draw)
      '@typescript-eslint/no-empty-function': 'off',

      // Entity sector pools use dynamic delete for removal
      '@typescript-eslint/no-dynamic-delete': 'off',

      // Game code uses || for defaults intentionally (0 and "" are falsy fallbacks)
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // Many defensive null checks from Impact.js port patterns
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // Nice-to-have but not critical for this codebase
      '@typescript-eslint/prefer-for-of': 'warn',

      // False positive with explicit .bind() calls
      '@typescript-eslint/unbound-method': 'warn',

      // Template literal expressions are common in game HUD code
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build.js'],
  },
);
