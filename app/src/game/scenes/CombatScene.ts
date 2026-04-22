/**
 * CombatScene — ISP v1.1 Steps 14 / 16 / 17
 *
 * Step 14: static layout + HP bars.
 * Step 16: FSM + EventBus wiring — spell buttons emit OPEN_QUIZ, QUIZ_RESULT
 *   drives FSM + scene pause/resume.
 * Step 17: full damage resolution —
 *   - QUIZ_CORRECT → ElementSystem.calculateDamage → monster HP mutation →
 *     VICTORY (emit EXIT_COMBAT, gain EXP, stop scene) or MONSTER_TURN.
 *   - QUIZ_WRONG or survived RESOLVE → monster retaliates flat damage to
 *     player HP → DEFEAT (emit EXIT_COMBAT, respawn) or PLAYER_TURN.
 *
 * Launched via scene.launch('CombatScene', {monsterId}) from WorldScene.
 */

import Phaser from 'phaser';
import { findMonsterById, type MonsterDef } from '@data/staticConfig/monsters';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { nextCombatState, type CombatState } from '@game/systems/CombatStateMachine';
import { calculateDamage } from '@game/systems/ElementSystem';
import { loadMockLOs } from '@data/supham/LearningObjectAdapter';
import type { LearningObject, Grade } from '@data/supham/LearningObjectSchema';
import type { Element } from '@/types/element';
import { HpBar } from '../entities/HpBar';

export const COMBAT_SCENE_KEY = 'CombatScene';

interface CombatSceneData {
  monsterId: number;
}

interface SpellDef {
  id: string;
  label: string;
  color: number;
  element: Element;
  basePower: number;
}

const SPELLS: readonly SpellDef[] = [
  { id: 'fire_blast', label: 'Fire', color: 0xff6633, element: 'Fire', basePower: 12 },
  { id: 'water_jet', label: 'Water', color: 0x3399ff, element: 'Water', basePower: 12 },
  { id: 'plant_whip', label: 'Plant', color: 0x66cc66, element: 'Plant', basePower: 12 },
  { id: 'ice_shard', label: 'Ice', color: 0x99ddff, element: 'Ice', basePower: 12 },
] as const;

// Phase 1 simplification: flat monster attack power. Phase 2 will use a
// monster.attackPower field + element-typed resolution vs player spell element.
const MONSTER_BASE_POWER = 10;

// Spawn respawn coords = WorldScene center (MAP_COLS/2 * TILE_SIZE, MAP_ROWS/2 * TILE_SIZE).
// Duplicated here to avoid cross-scene import; Step 21 main-menu router will consolidate.
const RESPAWN_X = 480;
const RESPAWN_Y = 320;

// TODO Step 18: read student grade from SaveState / profile.
const DEFAULT_GRADE: Grade = 'G5';
const DEFAULT_QUIZ_TYPE_ID = 3; // multiple choice

export class CombatScene extends Phaser.Scene {
  private monsterDef: MonsterDef | null = null;
  private monsterCurrentHp = 0;
  private playerHpBar: HpBar | null = null;
  private monsterHpBar: HpBar | null = null;
  private saveStateUnsub: (() => void) | null = null;

  private combatState: CombatState = 'INIT';
  private selectedSpellId: string | null = null;
  private activeLo: LearningObject | null = null;
  private quizResultUnsub: Unsubscribe | null = null;

  constructor() {
    super(COMBAT_SCENE_KEY);
  }

  init(data: CombatSceneData): void {
    this.monsterDef = findMonsterById(data.monsterId) ?? null;
    this.monsterCurrentHp = this.monsterDef?.baseHp ?? 0;
    this.combatState = 'INIT';
    this.selectedSpellId = null;
    this.activeLo = null;
  }

  create(): void {
    if (!this.monsterDef) {
      this.add
        .text(640, 360, 'Combat error: monster not found', {
          fontSize: '24px',
          color: '#ff5555',
        })
        .setOrigin(0.5);
      return;
    }

    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, 'bg_combat_forest').setDisplaySize(width, height);

    const monsterX = width * 0.28;
    const monsterY = height * 0.55;
    this.add.image(monsterX, monsterY, `monster_${this.monsterDef.codename}_idle`);
    this.add
      .text(monsterX, monsterY - 90, this.monsterDef.displayNameVi, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);

    const playerX = width * 0.72;
    const playerY = height * 0.55;
    this.add.sprite(playerX, playerY, 'wizard_walk', 4).setScale(2);

    const state = useSaveState.getState();
    this.playerHpBar = new HpBar(this, playerX, playerY + 90, state.hp, state.maxHp);
    this.monsterHpBar = new HpBar(
      this,
      monsterX,
      monsterY + 90,
      this.monsterCurrentHp,
      this.monsterDef.baseHp
    );

    this.saveStateUnsub = useSaveState.subscribe((s) => {
      this.playerHpBar?.setHp(s.hp, s.maxHp);
    });

    this.combatState = nextCombatState(this.combatState, { type: 'START' });
    this.renderSpellButtons();
    this.quizResultUnsub = eventBus.on('QUIZ_RESULT', ({ correct }) =>
      this.handleQuizResult(correct)
    );
  }

  private renderSpellButtons(): void {
    const { width, height } = this.scale;
    const buttonWidth = 140;
    const buttonHeight = 56;
    const gap = 16;
    const totalWidth = SPELLS.length * buttonWidth + (SPELLS.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    const y = height - 80;

    SPELLS.forEach((spell, i) => {
      const x = startX + i * (buttonWidth + gap);
      const rect = this.add.rectangle(x, y, buttonWidth, buttonHeight, spell.color);
      rect.setStrokeStyle(2, 0xffffff);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onSpellClick(spell.id));
      this.add
        .text(x, y, spell.label, {
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    });
  }

  /** Public entry point for spell pointerdown (also test-callable). */
  onSpellClick(spellId: string): void {
    if (this.combatState !== 'PLAYER_TURN') return;

    this.selectedSpellId = spellId;
    this.combatState = nextCombatState(this.combatState, { type: 'CLICK_SPELL', spellId });

    const pool = loadMockLOs(DEFAULT_QUIZ_TYPE_ID, DEFAULT_GRADE);
    if (pool.length === 0) {
      console.warn(
        `[CombatScene] No LOs for grade=${DEFAULT_GRADE} qt=${DEFAULT_QUIZ_TYPE_ID}; aborting spell`
      );
      this.combatState = 'PLAYER_TURN';
      this.selectedSpellId = null;
      return;
    }
    this.activeLo = pool[Math.floor(Math.random() * pool.length)]!;

    this.combatState = nextCombatState(this.combatState, { type: 'OPEN_QUIZ' });
    eventBus.emit('OPEN_QUIZ', {
      lo_id: this.activeLo.id,
      monster_id: this.monsterDef?.id ?? null,
    });
    this.scene.pause();
  }

  private handleQuizResult(correct: boolean): void {
    if (this.combatState !== 'QUIZ_GATE') return;

    this.combatState = nextCombatState(this.combatState, {
      type: correct ? 'QUIZ_CORRECT' : 'QUIZ_WRONG',
    });

    if (correct) {
      // state now RESOLVE_DAMAGE — apply player spell damage
      this.applyPlayerDamage();
      if (this.combatState === 'VICTORY') {
        this.handleVictory();
        return;
      }
      // else state = MONSTER_TURN — fall through to monster retaliation
    }

    // QUIZ_WRONG (MONSTER_TURN) or survived RESOLVE_DAMAGE → resume + monster attacks
    this.scene.resume();
    this.runMonsterTurn();
    if (this.combatState === 'DEFEAT') {
      this.handleDefeat();
    }
  }

  private applyPlayerDamage(): void {
    if (!this.selectedSpellId || !this.monsterDef || !this.activeLo) return;
    const spell = SPELLS.find((s) => s.id === this.selectedSpellId);
    if (!spell) return;

    const difficulty = parseInt(
      this.activeLo.learning_object_difficulty.learning_object_difficulty_name,
      10
    );
    const dmg = calculateDamage(
      spell.basePower,
      spell.element,
      this.monsterDef.element,
      difficulty,
      false
    );
    this.monsterCurrentHp = Math.max(0, this.monsterCurrentHp - dmg);
    this.monsterHpBar?.setHp(this.monsterCurrentHp, this.monsterDef.baseHp);
    this.combatState = nextCombatState(this.combatState, {
      type: 'DAMAGE_APPLIED',
      side: 'monster',
      remainingHp: this.monsterCurrentHp,
    });
  }

  private runMonsterTurn(): void {
    this.combatState = nextCombatState(this.combatState, { type: 'MONSTER_ACT' });
    this.combatState = nextCombatState(this.combatState, { type: 'HIT_RESOLVED' });
    const save = useSaveState.getState();
    const newHp = Math.max(0, save.hp - MONSTER_BASE_POWER);
    save.setHp(newHp);
    this.combatState = nextCombatState(this.combatState, {
      type: 'DAMAGE_APPLIED',
      side: 'player',
      remainingHp: newHp,
    });
  }

  private handleVictory(): void {
    const exp = this.monsterDef?.baseHp ?? 0;
    const monsterId = this.monsterDef?.id ?? null;
    useSaveState.getState().gainExp(exp);
    eventBus.emit('EXIT_COMBAT', {
      won: true,
      exp_gained: exp,
      monster_id: monsterId,
    });
    this.scene.stop();
  }

  private handleDefeat(): void {
    const monsterId = this.monsterDef?.id ?? null;
    const save = useSaveState.getState();
    save.setHp(save.maxHp);
    save.setPosition(RESPAWN_X, RESPAWN_Y);
    eventBus.emit('EXIT_COMBAT', {
      won: false,
      exp_gained: 0,
      monster_id: monsterId,
    });
    this.scene.stop();
  }

  shutdown(): void {
    this.saveStateUnsub?.();
    this.saveStateUnsub = null;
    this.quizResultUnsub?.();
    this.quizResultUnsub = null;
    this.playerHpBar?.destroy();
    this.monsterHpBar?.destroy();
    this.playerHpBar = null;
    this.monsterHpBar = null;
  }

  /** Test-only accessors */
  getMonsterDef(): MonsterDef | null {
    return this.monsterDef;
  }
  getMonsterHp(): number {
    return this.monsterCurrentHp;
  }
  getPlayerHpBar(): HpBar | null {
    return this.playerHpBar;
  }
  getMonsterHpBar(): HpBar | null {
    return this.monsterHpBar;
  }
  getCombatState(): CombatState {
    return this.combatState;
  }
  getSelectedSpellId(): string | null {
    return this.selectedSpellId;
  }
  /** Test-only: force monster HP to a specific value (for setting up VICTORY path). */
  __setMonsterHp(hp: number): void {
    this.monsterCurrentHp = hp;
    if (this.monsterDef) {
      this.monsterHpBar?.setHp(hp, this.monsterDef.baseHp);
    }
  }
}
