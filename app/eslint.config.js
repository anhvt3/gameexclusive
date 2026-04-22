// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * HARNESS: Layer boundary enforcement (AP 3.1)
 * Uses eslint-plugin-import `no-restricted-paths` — simpler + widely supported.
 */
export default tseslint.config(
  { ignores: ['dist', 'build', 'coverage', 'playwright-report', '.vite', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // HARNESS: Layer boundary enforcement (AP 3.1)
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Layer 1 React cannot import Layer 2 Phaser engine
            { target: './src/react', from: './src/game', message: '[Harness AP 3.1] src/react/** KHÔNG được import src/game/**. React là UI shell, Phaser là engine. Giao tiếp qua EventBus.' },
            // Layer 2 Phaser cannot import Layer 1 React
            { target: './src/game', from: './src/react', message: '[Harness AP 3.1] src/game/** KHÔNG được import src/react/**. Phaser scene không phụ thuộc UI.' },
            // Bus is pure
            { target: './src/bus', from: './src/react', message: '[Harness AP 3.1] EventBus phải pure, không import React.' },
            { target: './src/bus', from: './src/game', message: '[Harness AP 3.1] EventBus phải pure, không import Phaser.' },
            { target: './src/bus', from: './src/domain', message: '[Harness AP 3.1] EventBus không phụ thuộc domain.' },
            // Domain layer pure
            { target: './src/domain', from: './src/react', message: '[Harness AP 3.1] Domain không được import React.' },
            { target: './src/domain', from: './src/game', message: '[Harness AP 3.1] Domain không được import Phaser.' },
            // Data layer no UI
            { target: './src/data', from: './src/react', message: '[Harness AP 3.1] Data không được import React.' },
            { target: './src/data', from: './src/game', message: '[Harness AP 3.1] Data không được import Phaser.' },
            // Persistence no UI/engine
            { target: './src/persistence', from: './src/react', message: '[Harness AP 3.1] Persistence không được import React.' },
            { target: './src/persistence', from: './src/game', message: '[Harness AP 3.1] Persistence không được import Phaser.' },
          ],
        },
      ],
      'import/no-cycle': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/__tests__/**', 'scripts/**', 'tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'import/no-restricted-paths': 'off',
    },
  },
  prettier
);
