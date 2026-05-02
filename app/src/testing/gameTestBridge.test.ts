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
    start?: (key: string) => void;
    stop?: (key: string) => void;
  } = {}
) {
  const activeKeys = overrides.activeScenes ?? ['WorldScene'];
  return {
    scene: {
      getScene: overrides.getScene ?? (() => null),
      getScenes: (isActive?: boolean) =>
        isActive ? activeKeys.map((key) => ({ scene: { key } })) : [],
      start: overrides.start ?? (() => {}),
      stop: overrides.stop ?? (() => {}),
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

  it('setLegacyWorldFlag toggles SaveStateStore.useLegacyWorldScene', () => {
    attachGameTestBridge(makeGame());
    expect(useSaveState.getState().useLegacyWorldScene).toBe(false);
    window.__GAME__!.simulate.setLegacyWorldFlag(true);
    expect(useSaveState.getState().useLegacyWorldScene).toBe(true);
    window.__GAME__!.simulate.setLegacyWorldFlag(false);
    expect(useSaveState.getState().useLegacyWorldScene).toBe(false);
  });

  it('detach unsubscribes all listeners (no leak)', () => {
    const before = eventBus.getListenerCount();
    attachGameTestBridge(makeGame());
    expect(eventBus.getListenerCount()).toBeGreaterThan(before);
    detachGameTestBridge();
    expect(eventBus.getListenerCount()).toBe(before);
  });

  it('startWorldMap stops other scenes + starts WorldMapScene', () => {
    const start = vi.fn();
    const stop = vi.fn();
    attachGameTestBridge(makeGame({ activeScenes: ['WorldScene', 'CombatScene'], start, stop }));
    window.__GAME__!.simulate.startWorldMap();
    expect(stop).toHaveBeenCalledWith('WorldScene');
    expect(stop).toHaveBeenCalledWith('CombatScene');
    expect(start).toHaveBeenCalledWith('WorldMapScene');
  });

  it('clickIsland delegates to WorldMapScene.simulateClickIsland', () => {
    const simulateClickIsland = vi.fn();
    const fakeScene = { simulateClickIsland };
    attachGameTestBridge(
      makeGame({ getScene: (key) => (key === 'WorldMapScene' ? fakeScene : null) })
    );
    window.__GAME__!.simulate.clickIsland('forest');
    expect(simulateClickIsland).toHaveBeenCalledWith('forest');
  });

  it('clickIsland throws when WorldMapScene not active', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.clickIsland('forest')).toThrow(
      /WorldMapScene not active/
    );
  });

  it('advanceZoneScreen delegates to ZoneScene.clickAdvanceButton', () => {
    const clickAdvanceButton = vi.fn();
    const fakeScene = { clickAdvanceButton };
    attachGameTestBridge(makeGame({ getScene: (key) => (key === 'ZoneScene' ? fakeScene : null) }));
    window.__GAME__!.simulate.advanceZoneScreen();
    expect(clickAdvanceButton).toHaveBeenCalledTimes(1);
  });

  it('advanceZoneScreen throws when ZoneScene not active', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.advanceZoneScreen()).toThrow(/ZoneScene not active/);
  });

  it('walkPathSafe wires mask + click then resolves once walking ends', async () => {
    const simulateMaskAllWalkable = vi.fn();
    const simulateClickAt = vi.fn();
    let walking = true;
    const fakeScene = {
      simulateMaskAllWalkable,
      simulateClickAt,
      isPlayerWalking: () => walking,
    };
    attachGameTestBridge(makeGame({ getScene: (key) => (key === 'ZoneScene' ? fakeScene : null) }));
    const promise = window.__GAME__!.simulate.walkPathSafe();
    // Flip walking off after a tick so the polling loop terminates.
    setTimeout(() => {
      walking = false;
    }, 25);
    await promise;
    expect(simulateMaskAllWalkable).toHaveBeenCalledTimes(1);
    expect(simulateClickAt).toHaveBeenCalledWith({ x: 1180, y: 600 });
  });

  it('walkPathSafe throws when ZoneScene not active', async () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    await expect(window.__GAME__!.simulate.walkPathSafe()).rejects.toThrow(/ZoneScene not active/);
  });

  it('engageBoss delegates to BossHallScene.simulateBossClick', () => {
    const simulateBossClick = vi.fn();
    const fakeScene = { simulateBossClick };
    attachGameTestBridge(
      makeGame({ getScene: (key) => (key === 'BossHallScene' ? fakeScene : null) })
    );
    window.__GAME__!.simulate.engageBoss();
    expect(simulateBossClick).toHaveBeenCalledTimes(1);
  });

  it('engageBoss throws when BossHallScene not active', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.engageBoss()).toThrow(/BossHallScene not active/);
  });

  it('clickChest delegates to BossHallScene.simulateChestClick', () => {
    const simulateChestClick = vi.fn();
    const fakeScene = { simulateChestClick };
    attachGameTestBridge(
      makeGame({ getScene: (key) => (key === 'BossHallScene' ? fakeScene : null) })
    );
    window.__GAME__!.simulate.clickChest();
    expect(simulateChestClick).toHaveBeenCalledTimes(1);
  });

  it('clickChest throws when BossHallScene not active', () => {
    attachGameTestBridge(makeGame({ getScene: () => null }));
    expect(() => window.__GAME__!.simulate.clickChest()).toThrow(/BossHallScene not active/);
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
