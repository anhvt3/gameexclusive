// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

/**
 * ESLint flat config for Game_SS3_exclusive.
 *
 * HARNESS RULE ENFORCEMENT:
 * - Layer 1 React (src/react/**) KHÔNG import Phaser (src/game/**)
 * - Layer 2 Phaser (src/game/**) KHÔNG import React (src/react/**)
 * - Bus (src/bus/**), Domain (src/domain/**), Data (src/data/**) KHÔNG import UI layers
 * - Persistence (src/persistence/**) KHÔNG import UI/Engine
 *
 * AP Section 3.1 "6 Layers" — enforced by this config, not by comment.
 */
export default tseslint.config(
  { ignores: ['dist', 'build', 'coverage', 'playwright-report', '.vite'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      boundaries,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'boundaries/elements': [
        { type: 'react', pattern: 'src/react/*' },
        { type: 'game', pattern: 'src/game/*' },
        { type: 'bus', pattern: 'src/bus/*' },
        { type: 'domain', pattern: 'src/domain/*' },
        { type: 'data', pattern: 'src/data/*' },
        { type: 'persistence', pattern: 'src/persistence/*' },
        { type: 'events', pattern: 'src/events/*' },
        { type: 'utils', pattern: 'src/utils/*' },
        { type: 'types', pattern: 'src/types/*' },
      ],
      'boundaries/include': ['src/**/*.{ts,tsx}'],
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      // HARNESS — Layer boundary enforcement (AP Section 3.1)
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'react', allow: ['react', 'bus', 'domain', 'data', 'persistence', 'events', 'utils', 'types'] },
            { from: 'game', allow: ['game', 'bus', 'domain', 'data', 'persistence', 'events', 'utils', 'types'] },
            { from: 'bus', allow: ['bus', 'types'] },
            { from: 'domain', allow: ['domain', 'data', 'events', 'types', 'utils'] },
            { from: 'data', allow: ['data', 'persistence', 'types', 'utils'] },
            { from: 'persistence', allow: ['persistence', 'types', 'utils'] },
            { from: 'events', allow: ['events', 'types'] },
            { from: 'utils', allow: ['utils', 'types'] },
            { from: 'types', allow: ['types'] },
          ],
        },
      ],
      // Prevent cross-imports forbidden
      'import/no-cycle': 'error',
      'import/no-default-export': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Test files relax some rules
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'boundaries/element-types': 'off',
    },
  },
  prettier
);
