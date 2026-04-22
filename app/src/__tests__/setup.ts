/**
 * Vitest setup file — Game_SS3_exclusive
 *
 * Loaded before every test suite via vitest.config.ts setupFiles.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
