/**
 * gameTestBridge — ISP v1.1 Step 22.
 *
 * Attaches `window.__GAME__` in dev / test builds so Playwright can
 * drive the game deterministically without pixel-matching against the
 * Phaser canvas. The bridge exposes:
 *
 *   __GAME__.state.*       read-only accessors (scene, HP, flags, ...)
 *   __GAME__.simulate.*    fire events / invoke scene methods
 *   __GAME__.__phaser      escape hatch → the raw Phaser.Game instance
 *
 * Only attached when attachGameTestBridge(game) is called — production
 * code simply doesn't call it, so `window.__GAME__` stays undefined.
 * StrictMode double-invoke is safe: detach then re-attach overwrites
 * cleanly and never leaks bus subscriptions.
 *
 * Layer: src/testing is a cross-cutting utility — may import anywhere
 * but must not be imported by non-test production paths (except the
 * PhaserGame bridge file that hooks it).
 */

import type Phaser from 'phaser';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';
import type { CombatScene } from '@game/scenes/CombatScene';

export interface GameTestBridge {
  state: {
    activeScene: () => string | null;
    playerHp: () => number;
    playerMaxHp: () => number;
    playerLevel: () => number;
    playerExp: () => number;
    combatMonsterId: () => number | null;
    combatState: () => string | null;
    activeLoId: () => number | null;
    tutorialCompleted: () => boolean;
  };
  simulate: {
    completeTutorial: () => void;
    enterCombat: (monsterId: number) => void;
    clickSpell: (spellId: string) => void;
    submitQuiz: (correct: boolean) => void;
    setMonsterHp: (hp: number) => void;
    resetSaveState: () => void;
  };
  __phaser: Phaser.Game;
}

declare global {
  interface Window {
    __GAME__?: GameTestBridge;
  }
}

interface AttachedState {
  combatMonsterId: number | null;
  activeLoId: number | null;
  unsubs: Unsubscribe[];
}

let attached: AttachedState | null = null;

function getCombatScene(game: Phaser.Game): CombatScene | null {
  const scene = game.scene.getScene('CombatScene');
  return (scene as unknown as CombatScene) ?? null;
}

function getActiveSceneKey(game: Phaser.Game): string | null {
  // Phaser's SceneManager.getScenes(isActive=true) returns only scenes whose
  // SceneSystems status === RUNNING. More reliable than calling isActive() on
  // each scene, which can misreport during transitions.
  const active = game.scene.getScenes(true);
  if (active.length === 0) return null;
  return active[active.length - 1]!.scene.key;
}

export function attachGameTestBridge(game: Phaser.Game): void {
  detachGameTestBridge();

  const state: AttachedState = {
    combatMonsterId: null,
    activeLoId: null,
    unsubs: [],
  };

  state.unsubs.push(
    eventBus.on('ENTER_COMBAT', ({ monster_id }) => {
      state.combatMonsterId = monster_id;
    }),
    eventBus.on('EXIT_COMBAT', () => {
      state.combatMonsterId = null;
      state.activeLoId = null;
    }),
    eventBus.on('OPEN_QUIZ', ({ lo_id }) => {
      state.activeLoId = lo_id;
    }),
    eventBus.on('QUIZ_RESULT', () => {
      state.activeLoId = null;
    })
  );

  const bridge: GameTestBridge = {
    state: {
      activeScene: () => getActiveSceneKey(game),
      playerHp: () => useSaveState.getState().hp,
      playerMaxHp: () => useSaveState.getState().maxHp,
      playerLevel: () => useSaveState.getState().level,
      playerExp: () => useSaveState.getState().exp,
      combatMonsterId: () => state.combatMonsterId,
      combatState: () => getCombatScene(game)?.getCombatState() ?? null,
      activeLoId: () => state.activeLoId,
      tutorialCompleted: () => useSaveState.getState().flags[TUTORIAL_FLAG] === true,
    },
    simulate: {
      completeTutorial: () => useSaveState.getState().setFlag(TUTORIAL_FLAG, true),
      enterCombat: (monsterId) => {
        // Mirror what WorldScene does on overlap: emit bus event (so observability
        // + event-stream bridges record it), pause World, launch Combat through
        // WorldScene's ScenePlugin.
        eventBus.emit('ENTER_COMBAT', { monster_id: monsterId });
        const world = game.scene.getScene('WorldScene');
        if (!world) throw new Error('[gameTestBridge] WorldScene not active');
        world.scene.pause();
        world.scene.launch('CombatScene', { monsterId });
      },
      clickSpell: (spellId) => {
        const scene = getCombatScene(game);
        if (!scene) throw new Error('[gameTestBridge] CombatScene not active');
        scene.onSpellClick(spellId);
      },
      submitQuiz: (correct) => {
        if (state.activeLoId == null) {
          throw new Error('[gameTestBridge] No active quiz — clickSpell first');
        }
        eventBus.emit('QUIZ_RESULT', {
          correct,
          timeSpent: 1,
          attempts: 1,
          lo_id: state.activeLoId,
        });
      },
      setMonsterHp: (hp) => {
        const scene = getCombatScene(game);
        if (!scene) throw new Error('[gameTestBridge] CombatScene not active');
        scene.__setMonsterHp(hp);
      },
      resetSaveState: () => useSaveState.getState().reset(),
    },
    __phaser: game,
  };

  attached = state;
  window.__GAME__ = bridge;
}

export function detachGameTestBridge(): void {
  if (attached) {
    for (const off of attached.unsubs) off();
    attached = null;
  }
  delete window.__GAME__;
}
