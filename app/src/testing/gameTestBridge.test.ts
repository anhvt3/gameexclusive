import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '@bus/EventBus';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';
import { attachGameTestBridge, detachGameTestBridge } from './gameTestBridge';

// Minimal Phaser.Game stub — the bridge only uses .scene.{getScene, scenes}.
function makeGame(
  overrides: {
    getScene?: (key: string) => unknown;
    activeScenes?: string[];
  } = {}
) {
  const activeKeys = overrides.activeScenes ?? ['WorldScene'];
  return {
    scene: {
      getScene: overrides.getScene ?? (() => null),
      getScenes: (isActive?: boolean) =>
        isActive ? activeKeys.map((key) => ({ scene: { key } })) : [],
    },
  } as unknown as Phaser.Game;
}

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
  eventBus.clear();
});

afterEach(() => {
  detachGameTestBridge();
});

describe('gameTestBridge — state accessors', () => {
  it('attach assigns window.__GAME__; detach removes it', () => {
    expect(window.__GAME__).toBeUndefined();
    attachGameTestBridge(makeGame());
    expect(window.__GAME__).toBeDefined();
    detachGameTestBridge();
    expect(window.__GAME__).toBeUndefined();
  });

  it('activeScene returns last-active scene key', () => {
    attachGameTestBridge(makeGame({ activeScenes: ['WorldScene', 'CombatScene'] }));
    expect(window.__GAME__!.state.activeScene()).toBe('CombatScene');
  });

  it('playerHp / Exp / Level read SaveStateStore live', () => {
    attachGameTestBridge(makeGame());
    expect(window.__GAME__!.state.playerHp()).toBe(100);
    useSaveState.getState().setHp(42);
    expect(window.__GAME__!.state.playerHp()).toBe(42);
  });

  it('tutorialCompleted mirrors flag', () => {
    attachGameTestBridge(makeGame());
    expect(window.__GAME__!.state.tutorialCompleted()).toBe(false);
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    expect(window.__GAME__!.state.tutorialCompleted()).toBe(true);
  });
});

describe('gameTestBridge — simulate + event tracking', () => {
  it('enterCombat emits ENTER_COMBAT + pauses World + launches Combat', () => {
    const received: Array<{ monster_id: number }> = [];
    eventBus.on('ENTER_COMBAT', (p) => received.push(p));
    const pause = vi.fn();
    const launch = vi.fn();
    const worldScene = { scene: { pause, launch } };
    attachGameTestBridge(
      makeGame({ getScene: (key) => (key === 'WorldScene' ? worldScene : null) })
    );
    window.__GAME__!.simulate.enterCombat(7);
    expect(received).toEqual([{ monster_id: 7 }]);
    expect(window.__GAME__!.state.combatMonsterId()).toBe(7);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith('CombatScene', { monsterId: 7 });
  });

  it('enterCombat throws when WorldScene is not active', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.enterCombat(1)).toThrow(/WorldScene not active/);
  });

  it('OPEN_QUIZ tracks activeLoId; EXIT_COMBAT clears it', () => {
    attachGameTestBridge(makeGame());
    eventBus.emit('OPEN_QUIZ', { lo_id: 100001, monster_id: 1 });
    expect(window.__GAME__!.state.activeLoId()).toBe(100001);
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    expect(window.__GAME__!.state.activeLoId()).toBeNull();
    expect(window.__GAME__!.state.combatMonsterId()).toBeNull();
  });

  it('submitQuiz throws when no active LO', () => {
    attachGameTestBridge(makeGame());
    expect(() => window.__GAME__!.simulate.submitQuiz(true)).toThrow(/No active quiz/);
  });

  it('submitQuiz emits QUIZ_RESULT with tracked lo_id when available', () => {
    const received: Array<{ correct: boolean; lo_id?: number }> = [];
    eventBus.on('QUIZ_RESULT', (p) => received.push(p));
    attachGameTestBridge(makeGame());
    eventBus.emit('OPEN_QUIZ', { lo_id: 100002, monster_id: 1 });
    window.__GAME__!.simulate.submitQuiz(true);
    expect(received[0]).toMatchObject({ correct: true, lo_id: 100002 });
  });

  it('clickSpell throws when CombatScene not available', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.clickSpell('fire_blast')).toThrow(
      /CombatScene not active/
    );
  });

  it('clickSpell delegates to CombatScene.onSpellClick', () => {
    const onSpellClick = vi.fn();
    const fakeScene = { onSpellClick, __setMonsterHp: vi.fn() };
    attachGameTestBridge(makeGame({ getScene: () => fakeScene }));
    window.__GAME__!.simulate.clickSpell('water_jet');
    expect(onSpellClick).toHaveBeenCalledWith('water_jet');
  });

  it('completeTutorial + resetSaveState behave correctly', () => {
    attachGameTestBridge(makeGame());
    window.__GAME__!.simulate.completeTutorial();
    expect(window.__GAME__!.state.tutorialCompleted()).toBe(true);
    window.__GAME__!.simulate.resetSaveState();
    expect(window.__GAME__!.state.tutorialCompleted()).toBe(false);
  });

  it('detach unsubscribes all listeners (no leak)', () => {
    const before = eventBus.getListenerCount();
    attachGameTestBridge(makeGame());
    expect(eventBus.getListenerCount()).toBeGreaterThan(before);
    detachGameTestBridge();
    expect(eventBus.getListenerCount()).toBe(before);
  });

  it('attach is idempotent — double attach does not leak subscriptions', () => {
    const before = eventBus.getListenerCount();
    attachGameTestBridge(makeGame());
    const firstCount = eventBus.getListenerCount();
    attachGameTestBridge(makeGame());
    expect(eventBus.getListenerCount()).toBe(firstCount);
    detachGameTestBridge();
    expect(eventBus.getListenerCount()).toBe(before);
  });
});
