import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initAppLifecycle, AUDIO_MUTED_FLAG } from './appLifecycle';
import { eventBus } from '@bus/EventBus';
import { readMetricsQueue, clearMetricsQueue } from '@/observability/metrics';
import { __resetSentryForTests } from '@/observability/sentry';
import { clearEventStream } from '@/events/EventStreamStore';
import { audioManager } from '@/utils/AudioManager';
import { useSaveState } from '@persistence/SaveStateStore';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

beforeEach(async () => {
  eventBus.clear();
  clearMetricsQueue();
  __resetSentryForTests();
  await clearEventStream();
  audioManager.__reset();
  localStorage.clear();
  useSaveState.getState().reset();
  vi.unstubAllEnvs();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('initAppLifecycle — shell wiring', () => {
  it('emits game_session_start on init with grade + day_of_week', () => {
    const handle = initAppLifecycle();
    const q = readMetricsQueue();
    const start = q.find((e) => e.name === 'game_session_start');
    expect(start).toBeDefined();
    expect(start!.dims).toMatchObject({ grade: 'G5' });
    expect(typeof (start!.dims as { day_of_week: number }).day_of_week).toBe('number');
    handle.teardown();
  });

  it('teardown emits session_end with duration_ms + quizzes_attempted', async () => {
    const handle = initAppLifecycle();
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 2, attempts: 1, lo_id: 100001 });
    await new Promise((r) => setTimeout(r, 5));
    handle.teardown();
    const end = readMetricsQueue().find((e) => e.name === 'session_end');
    expect(end).toBeDefined();
    expect(end!.dims).toMatchObject({ quizzes_attempted: 2 });
    expect((end!.dims as { duration_ms: number }).duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('teardown unsubscribes all bridges (listener count back to zero)', () => {
    const before = eventBus.getListenerCount();
    const handle = initAppLifecycle();
    expect(eventBus.getListenerCount()).toBeGreaterThan(before);
    handle.teardown();
    expect(eventBus.getListenerCount()).toBe(before);
  });

  it('metrics bridge is live after init (ENTER_COMBAT → combat_started)', () => {
    const handle = initAppLifecycle();
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    expect(readMetricsQueue().some((e) => e.name === 'combat_started')).toBe(true);
    handle.teardown();
  });

  it('starts map BGM on init', () => {
    const handle = initAppLifecycle();
    expect(audioManager.getCurrentBgmKey()).toBe('map');
    handle.teardown();
  });

  it('syncs mute flag from SaveState.flags.audio_muted on init', () => {
    useSaveState.getState().setFlag(AUDIO_MUTED_FLAG, true);
    const handle = initAppLifecycle();
    expect(audioManager.getMuted()).toBe(true);
    handle.teardown();
  });

  it('ENTER_COMBAT → combat BGM, EXIT_COMBAT → map BGM', () => {
    const handle = initAppLifecycle();
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    expect(audioManager.getCurrentBgmKey()).toBe('combat');
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    expect(audioManager.getCurrentBgmKey()).toBe('map');
    handle.teardown();
  });

  it('teardown stops BGM', () => {
    const handle = initAppLifecycle();
    expect(audioManager.getCurrentBgmKey()).toBe('map');
    handle.teardown();
    expect(audioManager.getCurrentBgmKey()).toBeNull();
  });
});
