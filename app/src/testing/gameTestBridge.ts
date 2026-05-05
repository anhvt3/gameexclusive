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
import type { WorldMapScene } from '@game/scenes/WorldMapScene';

// Inline the scene key as a string literal so the bridge does NOT pull
// WorldMapScene.ts (which extends Phaser.Scene at module-eval) into the test
// import graph. WorldScene is referenced the same way (string key only).
const WORLD_MAP_SCENE_KEY = 'WorldMapScene';
const ZONE_SCENE_KEY = 'ZoneScene';
const BOSS_HALL_SCENE_KEY = 'BossHallScene';

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
  /**
   * Sprint B Task 13 — read full SaveState snapshot for E2E persistence
   * checks (defeatedBossIds / claimedChestIds / currentZoneId).
   */
  getSaveState: () => ReturnType<typeof useSaveState.getState>;
  simulate: {
    completeTutorial: () => void;
    enterCombat: (monsterId: number) => void;
    clickSpell: (spellId: string) => void;
    submitQuiz: (correct: boolean) => void;
    setMonsterHp: (hp: number) => void;
    resetSaveState: () => void;
    setLegacyWorldFlag: (v: boolean) => void;
    startWorldMap: () => void;
    clickIsland: (islandId: string) => void;
    advanceZoneScreen: () => void;
    startZonePath: (zoneId: string) => void;
    startBossHall: (zoneId: string) => void;
    walkPathSafe: () => Promise<void>;
    engageBoss: () => void;
    clickChest: () => void;
    // Sprint C Task 9 — PetRescueOverlay test driver hooks
    acceptPet: () => void;
    releasePet: () => void;
    seedRng: (value: number) => void;
    // Sprint D Task 13 — reset quest cycle anchors to a fixed `now` so the
    // daily/weekly reset doesn't fire mid-test, plus zero out questProgress
    // and claimedRewards. Dispatches via dynamic ESM import to keep the
    // bridge module's eval graph free of Sprint D-specific deps (matches
    // the seedRng / scene-key isolation discipline above).
    setQuestCycleAnchors: (now: number) => void;
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
      setLegacyWorldFlag: (v) => useSaveState.getState().setLegacyWorldFlag(v),
      startWorldMap: () => {
        // Stop every other active scene then start WorldMapScene fresh so the
        // bridge always lands on a clean macro-map state.
        const sm = game.scene;
        const active = sm.getScenes(true) ?? [];
        for (const s of active) {
          const key = s.scene.key;
          if (key !== WORLD_MAP_SCENE_KEY) sm.stop(key);
        }
        sm.start(WORLD_MAP_SCENE_KEY);
      },
      clickIsland: (islandId: string) => {
        const scene = game.scene.getScene(WORLD_MAP_SCENE_KEY) as WorldMapScene | null;
        if (!scene) throw new Error('[gameTestBridge] WorldMapScene not active');
        scene.simulateClickIsland(islandId as never);
      },
      advanceZoneScreen: () => {
        const scene = game.scene.getScene(ZONE_SCENE_KEY) as {
          clickAdvanceButton?: () => void;
        } | null;
        if (!scene || typeof scene.clickAdvanceButton !== 'function') {
          throw new Error('[gameTestBridge] ZoneScene not active');
        }
        scene.clickAdvanceButton();
      },
      startZonePath: (zoneId: string) => {
        const sm = game.scene;
        const active = sm.getScenes(true) ?? [];
        for (const s of active) {
          sm.stop(s.scene.key);
        }
        sm.start(ZONE_SCENE_KEY, { zoneId, screen: 'path' });
      },
      startBossHall: (zoneId: string) => {
        const sm = game.scene;
        const active = sm.getScenes(true) ?? [];
        for (const s of active) {
          sm.stop(s.scene.key);
        }
        sm.start(BOSS_HALL_SCENE_KEY, { zoneId });
      },
      engageBoss: () => {
        const scene = game.scene.getScene(BOSS_HALL_SCENE_KEY) as {
          simulateBossClick?: () => void;
        } | null;
        if (!scene || typeof scene.simulateBossClick !== 'function') {
          throw new Error('[gameTestBridge] BossHallScene not active');
        }
        scene.simulateBossClick();
      },
      clickChest: () => {
        const scene = game.scene.getScene(BOSS_HALL_SCENE_KEY) as {
          simulateChestClick?: () => void;
        } | null;
        if (!scene || typeof scene.simulateChestClick !== 'function') {
          throw new Error('[gameTestBridge] BossHallScene not active');
        }
        scene.simulateChestClick();
      },
      acceptPet: () => {
        document.querySelector<HTMLButtonElement>('[data-testid="pet-rescue-collect"]')?.click();
      },
      releasePet: () => {
        document.querySelector<HTMLButtonElement>('[data-testid="pet-rescue-release"]')?.click();
      },
      seedRng: (value: number) => {
        // CombatScene exports __setCombatRng as the canonical test seam
        // for the module-scoped _combatRng (see CombatScene.ts:48).
        // Resolve dynamically so this bridge file does NOT pull Phaser
        // (via CombatScene.ts module-eval) into non-Phaser test import
        // graphs — matches the same isolation discipline used for the
        // WorldMapScene/ZoneScene/BossHallScene scene-key constants.
        void import('@game/scenes/CombatScene').then((mod) => {
          mod.__setCombatRng(() => value);
        });
      },
      setQuestCycleAnchors: (now: number) => {
        // Dynamic import to avoid pulling SaveState into the bridge module's
        // eval graph (mirrors seedRng's pattern). Anchor to `now` so daily
        // and weekly cycles don't refresh mid-test.
        void import('@domain/QuestCycle').then((cycleModule) => {
          useSaveState.setState({
            questProgress: {},
            claimedRewards: [],
            questCycleAnchors: {
              dailyEpochUtc7: cycleModule.dailyAnchor(now),
              weeklyEpochUtc7: cycleModule.weeklyAnchor(now),
            },
          });
        });
      },
      walkPathSafe: async () => {
        type ZoneSceneTestSurface = {
          simulateMaskAllWalkable: () => void;
          simulateClickAt: (p: { x: number; y: number }) => void;
          monsters?: unknown[];
          tweens?: { add?: unknown };
        };
        const scene = game.scene.getScene(ZONE_SCENE_KEY) as unknown as ZoneSceneTestSurface | null;
        if (!scene) {
          throw new Error('[gameTestBridge] ZoneScene not active');
        }
        scene.simulateMaskAllWalkable();
        if (Array.isArray(scene.monsters)) {
          scene.monsters = [];
        }

        // Force synchronous traversal by temporarily disabling tweens
        const oldAdd = scene.tweens?.add;
        if (scene.tweens) {
          scene.tweens.add = undefined;
        }

        scene.simulateClickAt({ x: 1180, y: 600 });

        if (scene.tweens) {
          scene.tweens.add = oldAdd;
        }

        // No need to wait since traversal was synchronous, but keep the promise signature
        await Promise.resolve();
      },
    },
    getSaveState: () => useSaveState.getState(),
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
