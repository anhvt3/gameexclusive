import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Phase 5 C.4 — vite.config.ts is now a function (mode-aware). Resolve it
// for test mode so vitest sees a plain UserConfig.
const resolvedViteConfig = viteConfig({ mode: 'test', command: 'serve' });

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', 'tests/e2e/', '**/*.config.*', '**/*.d.ts', 'scripts/'],
        thresholds: {
          lines: 60,
          functions: 60,
          branches: 50,
          statements: 60,
        },
      },
    },
  })
);
