/**
 * CombatScene — ISP v1.1 Step 14 + Step 16
 *
 * Step 14: static layout + HP bars.
 * Step 16: FSM + EventBus wiring — spell buttons emit OPEN_QUIZ, listen
 *   QUIZ_RESULT → FSM transition → Phaser scene pause/resume.
 *
 * Damage resolution (Step 17) still pending — QUIZ_CORRECT just lands state
 * in RESOLVE_DAMAGE, no HP mutation yet.
 *
 * Launched via scene.launch('CombatScene', {monsterId}) from WorldScene overlap.
 */

import Phaser from 'phaser';
import { findMonsterById, type MonsterDef } from '@data/staticConfig/monsters';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { nextCombatState, type CombatState } from '@game/systems/CombatStateMachine';
import { loadMockLOs } from '@data/supham/LearningObjectAdapter';
import type { Grade } from '@data/supham/LearningObjectSchema';
import { HpBar } from '../entities/HpBar';

export const COMBAT_SCENE_KEY = 'CombatScene';

interface CombatSceneData {
  monsterId: number;
}

interface SpellDef {
  id: string;
  label: string;
  color: number;
}

const SPELLS: readonly SpellDef[] = [
  { id: 'fire_blast', label: 'Fire', color: 0xff6633 },
  { id: 'water_jet', label: 'Water', color: 0x3399ff },
  { id: 'plant_whip', label: 'Plant', color: 0x66cc66 },
  { id: 'ice_shard', label: 'Ice', color: 0x99ddff },
] as const;

// TODO Step 18: read student grade from SaveState / profile.
const DEFAULT_GRADE: Grade = 'G5';
const DEFAULT_QUIZ_TYPE_ID = 3; // multiple choice

export class CombatScene extends Phaser.Scene {
  private monsterDef: MonsterDef | null = null;
  private monsterCurrentHp = 0;
  private playerHpBar: HpBar | null = null;
  private monsterHpBar: HpBar | null = null;
  private saveStateUnsub: (() => void) | null = null;

  // Step 16
  private combatState: CombatState = 'INIT';
  private selectedSpellId: string | null = null;
  private quizResultUnsub: Unsubscribe | null = null;

  constructor() {
    super(COMBAT_SCENE_KEY);
  }

  init(data: CombatSceneData): void {
    this.monsterDef = findMonsterById(data.monsterId) ?? null;
    this.monsterCurrentHp = this.monsterDef?.baseHp ?? 0;
    this.combatState = 'INIT';
    this.selectedSpellId = null;
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

    // Step 16: FSM start + spell UI + quiz-result subscription
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
    const lo = pool[Math.floor(Math.random() * pool.length)]!;

    this.combatState = nextCombatState(this.combatState, { type: 'OPEN_QUIZ' });
    eventBus.emit('OPEN_QUIZ', {
      lo_id: lo.id,
      monster_id: this.monsterDef?.id ?? null,
    });
    this.scene.pause();
  }

  private handleQuizResult(correct: boolean): void {
    if (this.combatState !== 'QUIZ_GATE') return;
    this.combatState = nextCombatState(this.combatState, {
      type: correct ? 'QUIZ_CORRECT' : 'QUIZ_WRONG',
    });
    this.scene.resume();
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
}
