/**
 * WorldScene — ISP v1.1 Step 13 (expansion)
 *
 * Top-down world map, placeholder checkerboard background.
 * Spawns 5 starter monsters at hard-coded positions.
 * Player overlap with any enemy → emit ENTER_COMBAT + pause scene.
 *
 * Tilemap from Tiled editor is Step 14+ — pending real tileset asset.
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import {
  STARTER_MONSTERS,
  DAILY_BOSS_MONSTER_ID,
  type MonsterDef,
} from '@data/staticConfig/monsters';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { useSaveState } from '@persistence/SaveStateStore';
import { BOSS_PENDING_FLAG, todayIso } from '@domain/BossQuest';

export const WORLD_SCENE_KEY = 'WorldScene';
export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

/** Hard-coded spawn positions for Phase 1 (grid coords × TILE_SIZE). */
const SPAWN_POSITIONS: Array<{ col: number; row: number }> = [
  { col: 5, row: 4 },
  { col: 24, row: 4 },
  { col: 5, row: 15 },
  { col: 24, row: 15 },
  { col: 15, row: 3 },
];

export class WorldScene extends Phaser.Scene {
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private combatTriggered = false;
  private exitCombatUnsub: Unsubscribe | null = null;

  constructor() {
    super(WORLD_SCENE_KEY);
  }

  create(): void {
    this.combatTriggered = false;
    this.enemies = [];
    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#2a5a3a');
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.drawBackground(worldWidth, worldHeight);
    this.spawnEnemies();

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);
    this.registerPlayerEnemyOverlap();

    // Step 13.5 — camera follows the player and clamps to world bounds so the
    // 1280×720 canvas (Scale.FIT) doesn't show black gutters when the world
    // is smaller than the viewport.
    const cam = this.cameras.main;
    if (cam && typeof cam.setBounds === 'function') {
      cam.setBounds(0, 0, worldWidth, worldHeight);
      if (typeof cam.startFollow === 'function') {
        cam.startFollow(
          this.player.sprite as unknown as Phaser.GameObjects.GameObject,
          true,
          0.1,
          0.1
        );
      }
      if (typeof cam.setZoom === 'function') {
        cam.setZoom(1.5);
      }
    }

    // Step 17: listen for combat exit — remove defeated enemy, resume scene
    this.exitCombatUnsub = eventBus.on('EXIT_COMBAT', ({ won, monster_id }) => {
      if (won && monster_id != null) {
        this.removeEnemyById(monster_id);
      }
      this.combatTriggered = false;
      this.scene.resume();
    });

    // Step 22.6: MainMenu sets boss_pending flag before navigating here;
    // fulfill the request by launching boss combat + stamping attempt date.
    const save = useSaveState.getState();
    if (save.flags[BOSS_PENDING_FLAG]) {
      save.setFlag(BOSS_PENDING_FLAG, false);
      save.setLastBossAttemptDate(todayIso());
      this.combatTriggered = true;
      eventBus.emit('ENTER_COMBAT', { monster_id: DAILY_BOSS_MONSTER_ID });
      this.scene.pause();
      this.scene.launch('CombatScene', { monsterId: DAILY_BOSS_MONSTER_ID });
    }
  }

  shutdown(): void {
    this.exitCombatUnsub?.();
    this.exitCombatUnsub = null;
  }

  private removeEnemyById(monsterId: number): void {
    const idx = this.enemies.findIndex((e) => e.monsterId === monsterId);
    if (idx === -1) return;
    const enemy = this.enemies[idx]!;
    enemy.sprite.destroy();
    this.enemies.splice(idx, 1);
  }

  update(): void {
    this.player?.update();
  }

  private spawnEnemies(): void {
    const defs = STARTER_MONSTERS.slice(0, SPAWN_POSITIONS.length);
    defs.forEach((def: MonsterDef, i: number) => {
      const pos = SPAWN_POSITIONS[i]!;
      const x = pos.col * TILE_SIZE + TILE_SIZE / 2;
      const y = pos.row * TILE_SIZE + TILE_SIZE / 2;
      this.enemies.push(new Enemy(this, x, y, def));
    });
  }

  private registerPlayerEnemyOverlap(): void {
    if (!this.player) return;
    const enemySprites = this.enemies.map((e) => e.sprite);
    this.physics.add.overlap(
      this.player.sprite as unknown as Phaser.GameObjects.GameObject,
      enemySprites as unknown as Phaser.GameObjects.GameObject[],
      (_player, enemySprite) => {
        if (this.combatTriggered) return;
        const enemy = (enemySprite as unknown as { getData: (k: string) => unknown }).getData(
          'enemy'
        ) as Enemy;
        if (!enemy) return;
        this.combatTriggered = true;
        eventBus.emit('ENTER_COMBAT', { monster_id: enemy.monsterId });
        this.scene.pause();
        this.scene.launch('CombatScene', { monsterId: enemy.monsterId });
      }
    );
  }

  private drawBackground(worldWidth: number, worldHeight: number): void {
    // Use the loaded forest tileset as a tiled background. When the texture
    // isn't available (unit test or 404), fall back to the original
    // checkerboard so visual layouts still snapshot reproducibly.
    const hasTileset =
      this.textures && typeof this.textures.exists === 'function'
        ? this.textures.exists('forest_tileset')
        : false;
    if (hasTileset && typeof this.add.tileSprite === 'function') {
      this.add.tileSprite(0, 0, worldWidth, worldHeight, 'forest_tileset').setOrigin(0, 0);
      return;
    }
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const color = (x + y) % 2 === 0 ? 0x558b2f : 0x7cb342;
        this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          color
        );
      }
    }
  }

  getPlayer(): Player | null {
    return this.player;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  /** Test-only helper: expose combat state. */
  isCombatTriggered(): boolean {
    return this.combatTriggered;
  }
}
