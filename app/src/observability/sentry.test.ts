import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, captureException, isSentryInitialized, __resetSentryForTests } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

beforeEach(() => {
  __resetSentryForTests();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('sentry — init + captureException', () => {
  it('initSentry() no-ops when VITE_SENTRY_DSN unset → returns false', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const result = initSentry();
    expect(result).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isSentryInitialized()).toBe(false);
  });

  it('initSentry() wires SDK when DSN set → returns true', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.io/1');
    const result = initSentry();
    expect(result).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://fake@sentry.io/1' })
    );
    expect(isSentryInitialized()).toBe(true);
  });

  it('captureException() pre-init is a safe no-op', () => {
    const err = new Error('before init');
    expect(() => captureException(err)).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('captureException() delegates when initialized', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.io/1');
    initSentry();
    const err = new Error('boom');
    captureException(err, { eventType: 'QUIZ_RESULT' });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { eventType: 'QUIZ_RESULT' },
    });
  });

  it('captureException() without context passes plain error', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.io/1');
    initSentry();
    const err = new Error('plain');
    captureException(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, undefined);
  });
});
