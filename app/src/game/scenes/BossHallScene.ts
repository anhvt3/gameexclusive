/**
 * BossHallScene — Sprint B Task 10.
 *
 * Third and final scene in the zone chain (entrance → path → boss hall).
 * Reached via `scene.start('BossHallScene', { zoneId })` from ZoneScene.
 *
 * Three branches based on persisted save state:
 *   1. Fresh — boss not yet defeated. Click boss → CombatScene.
 *      On EXIT_COMBAT(won, monster_id===zone.bossId): mark defeated,
 *      spawn chest at chestAnchor.
 *   2. Defeated, chest unclaimed — chest visible, click to claim.
 *   3. Conquered (defeated + claimed) — only "Đã chinh phục" banner.
 *
 * Persistence keys:
 *   - bossId (string)  = `${islandId}-boss`     → addDefeatedBoss / hasDefeatedBoss
 *   - chestId          = zone.chest.id          → addClaimedChest / hasClaimedChest
 *   - The numeric monster id lives on zone.bossId; that one is what
 *     CombatScene + ENTER_COMBAT consume. They are intentionally distinct.
 *
 * "Quay lại" button (always visible) emits EXIT_ZONE { reason: 'retreat' },
 * clears currentZoneId, returns to WorldMapScene.
 *
 * Layer (AP 3.1): pure Phaser scene; MUST NOT import React.
 */

import Phaser from 'phaser';
import { z } from 'zod';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { getZoneByZoneId } from '@/domain/ZoneRegistry';
import { useSaveState } from '@persistence/SaveStateStore';
import { ALL_MONSTERS, type MonsterDef } from '@data/staticConfig/monsters';
import type { ZoneDef } from '@/types/zone';

export const BOSS_HALL_SCENE_KEY = 'BossHallScene';
export const CHEST_TEXTURE_KEY = 'chest-zone';

const InitDataSchema = z.object({
  zoneId: z.string(),
});

interface SpriteLike {
  x: number;
  y: number;
  destroy?: () => void;
  setOrigin?: (x: number, y: number) => unknown;
  setDisplaySize?: (w: number, h: number) => unknown;
  setInteractive?: (...a: unknown[]) => unknown;
  on?: (evt: string, cb: () => void) => unknown;
}

interface TextLike extends SpriteLike {
  text?: string;
  setOrigin?: (x: number, y: number) => unknown;
}

export class BossHallScene extends Phaser.Scene {
  private zoneId: string = 'forest-island';
  private bossSprite: SpriteLike | null = null;
  private chestSprite: SpriteLike | null = null;
  private banner: TextLike | null = null;
  private exitCombatUnsub: Unsubscribe | null = null;
  private paused = false;
  private _lastStartKey: string | null = null;
  private _lastStartData: Record<string, unknown> | null = null;
  private _zone: ZoneDef | null = null;
  private _bossPersistId: string = '';
  private _chestPersistId: string = '';

  constructor() {
    super(BOSS_HALL_SCENE_KEY);
  }

  init(data: unknown): void {
    const parsed = InitDataSchema.safeParse(data);
    if (parsed.success) {
      this.zoneId = parsed.data.zoneId;
    } else {
      console.error('[BossHallScene] init payload invalid; falling back', parsed.error);
      this.zoneId = 'forest-island';
    }
  }

  create(): void {
    // Reset per-create state.
    this.bossSprite = null;
    this.chestSprite = null;
    this.banner = null;
    this.paused = false;
    this._lastStartKey = null;
    this._lastStartData = null;
    this.exitCombatUnsub?.();
    this.exitCombatUnsub = null;

    const zone = getZoneByZoneId(this.zoneId);
    if (!zone) {
      console.error(`[BossHallScene] unknown zoneId="${this.zoneId}"; routing to WorldMapScene`);
      this._lastStartKey = 'WorldMapScene';
      this.scene.start('WorldMapScene');
      return;
    }
    this._zone = zone;
    this._bossPersistId = `${zone.islandId}-boss`;
    this._chestPersistId = zone.chest.id;

    useSaveState.getState().setCurrentZoneId(this.zoneId);

    this.renderBackground(zone);

    const save = useSaveState.getState();
    const defeated = save.hasDefeatedBoss(this._bossPersistId);
    const claimed = save.hasClaimedChest(this._chestPersistId);

    if (defeated && claimed) {
      this.renderConqueredBanner();
    } else if (defeated && !claimed) {
      this.spawnChest(zone);
    } else {
      this.spawnBoss(zone);
      this.exitCombatUnsub = eventBus.on('EXIT_COMBAT', ({ won, monster_id }) => {
        if (won && monster_id === zone.bossId) {
          this.handleBossDefeated(zone);
        }
        this.scene.resume();
        this.paused = false;
      });
    }

    this.renderRetreatButton();
  }

  shutdown(): void {
    this.exitCombatUnsub?.();
    this.exitCombatUnsub = null;
  }

  // ─── private builders ──────────────────────────────────────────────

  private renderBackground(zone: ZoneDef): void {
    if (typeof this.add?.image === 'function') {
      const img = this.add.image(640, 360, zone.bgBossHall);
      (img as unknown as { setOrigin?: (x: number, y: number) => unknown }).setOrigin?.(0.5, 0.5);
    }
  }

  private spawnBoss(zone: ZoneDef): void {
    const def = ALL_MONSTERS.find((m: MonsterDef) => m.id === zone.bossId);
    const textureKey = def ? `monster_${def.codename}_idle` : 'monster_aldergasp_idle';
    const { x, y } = zone.bossAnchor;
    let sprite: SpriteLike;
    if (typeof this.add?.sprite === 'function') {
      sprite = this.add.sprite(x, y, textureKey) as unknown as SpriteLike;
    } else if (typeof this.add?.rectangle === 'function') {
      sprite = this.add.rectangle(x, y, 96, 96, 0xff5555) as unknown as SpriteLike;
    } else {
      sprite = { x, y, destroy: () => {} };
    }
    sprite.setOrigin?.(0.5, 0.5);
    sprite.setInteractive?.({ useHandCursor: true });
    sprite.on?.('pointerdown', () => this.onBossClick());
    this.bossSprite = sprite;
  }

  private spawnChest(zone: ZoneDef): void {
    const { x, y } = zone.chestAnchor;
    let sprite: SpriteLike;
    if (typeof this.add?.image === 'function') {
      sprite = this.add.image(x, y, CHEST_TEXTURE_KEY) as unknown as SpriteLike;
    } else if (typeof this.add?.rectangle === 'function') {
      sprite = this.add.rectangle(x, y, 96, 64, 0xc8a45a) as unknown as SpriteLike;
    } else {
      sprite = { x, y, destroy: () => {} };
    }
    sprite.setOrigin?.(0.5, 0.5);
    sprite.setInteractive?.({ useHandCursor: true });
    sprite.on?.('pointerdown', () => this.onChestClick());
    this.chestSprite = sprite;
  }

  private renderConqueredBanner(): void {
    if (typeof this.add?.text !== 'function') {
      this.banner = { x: 640, y: 360, text: 'Đã chinh phục' };
      return;
    }
    const t = this.add.text(640, 360, 'Đã chinh phục', {
      fontSize: '48px',
      color: '#ffd966',
      backgroundColor: '#1a1a2acc',
      padding: { x: 24, y: 12 },
    } as unknown as Phaser.Types.GameObjects.Text.TextStyle);
    (t as unknown as { setOrigin?: (x: number, y: number) => unknown }).setOrigin?.(0.5, 0.5);
    this.banner = t as unknown as TextLike;
  }

  private renderRetreatButton(): void {
    if (typeof this.add?.text !== 'function') return;
    const btn = this.add.text(80, 660, 'Quay lại', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#5a2a2acc',
      padding: { x: 12, y: 6 },
    } as unknown as Phaser.Types.GameObjects.Text.TextStyle);
    const btnAny = btn as unknown as SpriteLike;
    btnAny.setInteractive?.({ useHandCursor: true });
    btnAny.on?.('pointerdown', () => this.onRetreatClick());
  }

  // ─── handlers ──────────────────────────────────────────────────────

  private onBossClick(): void {
    if (!this._zone) return;
    eventBus.emit('ENTER_COMBAT', { monster_id: this._zone.bossId });
    this.scene.pause();
    this.paused = true;
    this.scene.launch('CombatScene', { monsterId: this._zone.bossId });
  }

  private handleBossDefeated(zone: ZoneDef): void {
    useSaveState.getState().addDefeatedBoss(this._bossPersistId);
    eventBus.emit('BOSS_DEFEATED', { bossId: this._bossPersistId, zoneId: this.zoneId });
    this.bossSprite?.destroy?.();
    this.bossSprite = null;
    this.spawnChest(zone);
  }

  private onChestClick(): void {
    if (!this._zone) return;
    useSaveState.getState().addClaimedChest(this._chestPersistId);
    eventBus.emit('CHEST_OPENED', {
      chestId: this._chestPersistId,
      zoneId: this.zoneId,
      items: this._zone.chest.rewardItems.map((r) => ({ itemId: r.itemId, qty: r.qty })),
    });
  }

  private onRetreatClick(): void {
    eventBus.emit('EXIT_ZONE', { zoneId: this.zoneId, reason: 'retreat' });
    useSaveState.getState().setCurrentZoneId(null);
    this._lastStartKey = 'WorldMapScene';
    this._lastStartData = null;
    this.scene.start('WorldMapScene');
  }

  // ─── test helpers ──────────────────────────────────────────────────

  getZoneId(): string {
    return this.zoneId;
  }
  hasBossSprite(): boolean {
    return this.bossSprite !== null;
  }
  hasChestSprite(): boolean {
    return this.chestSprite !== null;
  }
  hasConqueredBanner(): boolean {
    return this.banner !== null;
  }
  wasPaused(): boolean {
    return this.paused;
  }
  lastSceneStartKey(): string | null {
    return this._lastStartKey;
  }
  lastSceneStartData(): Record<string, unknown> | null {
    return this._lastStartData;
  }

  simulateBossClick(): void {
    this.onBossClick();
  }

  simulateChestClick(): void {
    this.onChestClick();
  }

  simulateRetreatClick(): void {
    this.onRetreatClick();
  }
}
