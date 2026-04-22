/**
 * CombatScene — ISP v1.1 Step 14
 *
 * Static layout only. No combat logic, no spell selection, no state machine.
 * - Reads SaveStateStore for player HP/maxHp
 * - Resolves monster_id → MonsterDef for monster baseHp
 * - Renders: forest background + player (right) + monster (left) + 2 HP bars
 * - Subscribes to SaveState → player HP bar reactive
 * - On shutdown: unsubscribe, destroy HP bars
 *
 * Launched via scene.launch('CombatScene', {monsterId}) from WorldScene overlap.
 */

import Phaser from 'phaser';
import { findMonsterById, type MonsterDef } from '@data/staticConfig/monsters';
import { useSaveState } from '@persistence/SaveStateStore';
import { HpBar } from '../entities/HpBar';

export const COMBAT_SCENE_KEY = 'CombatScene';

interface CombatSceneData {
  monsterId: number;
}

export class CombatScene extends Phaser.Scene {
  private monsterDef: MonsterDef | null = null;
  private monsterCurrentHp = 0;
  private playerHpBar: HpBar | null = null;
  private monsterHpBar: HpBar | null = null;
  private saveStateUnsub: (() => void) | null = null;

  constructor() {
    super(COMBAT_SCENE_KEY);
  }

  init(data: CombatSceneData): void {
    this.monsterDef = findMonsterById(data.monsterId) ?? null;
    this.monsterCurrentHp = this.monsterDef?.baseHp ?? 0;
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

    // Background (full-canvas image)
    this.add.image(width / 2, height / 2, 'bg_combat_forest').setDisplaySize(width, height);

    // Monster LEFT facing right
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

    // Player RIGHT facing left (wizard spritesheet frame 5 = left-facing walk)
    const playerX = width * 0.72;
    const playerY = height * 0.55;
    this.add.sprite(playerX, playerY, 'wizard_walk', 4).setScale(2);

    // HP bars
    const state = useSaveState.getState();
    this.playerHpBar = new HpBar(this, playerX, playerY + 90, state.hp, state.maxHp);
    this.monsterHpBar = new HpBar(
      this,
      monsterX,
      monsterY + 90,
      this.monsterCurrentHp,
      this.monsterDef.baseHp
    );

    // Reactive: player HP bar updates when SaveState changes
    this.saveStateUnsub = useSaveState.subscribe((s) => {
      this.playerHpBar?.setHp(s.hp, s.maxHp);
    });

    // Phase 1 placeholder instruction
    this.add
      .text(width / 2, height - 40, 'CombatScene — static layout (Step 15+ sẽ thêm logic)', {
        fontSize: '14px',
        color: '#ffffff99',
      })
      .setOrigin(0.5);
  }

  shutdown(): void {
    this.saveStateUnsub?.();
    this.saveStateUnsub = null;
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
}
