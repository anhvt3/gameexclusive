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
import { STARTER_MONSTERS, type MonsterDef } from '@data/staticConfig/monsters';
import { eventBus } from '@bus/EventBus';

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

    this.drawPlaceholderGrid(worldWidth, worldHeight);
    this.spawnEnemies();

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);
    this.registerPlayerEnemyOverlap();
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
    this.physics.add.overlap(this.player.sprite, enemySprites, (_player, enemySprite) => {
      if (this.combatTriggered) return;
      const enemy = (enemySprite as Phaser.GameObjects.Rectangle).getData('enemy') as Enemy;
      if (!enemy) return;
      this.combatTriggered = true;
      eventBus.emit('ENTER_COMBAT', { monster_id: enemy.monsterId });
      this.scene.pause();
      this.scene.launch('CombatScene', { monsterId: enemy.monsterId });
    });
  }

  private drawPlaceholderGrid(worldWidth: number, worldHeight: number): void {
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
    this.add
      .text(worldWidth - 8, worldHeight - 8, `${MAP_COLS}×${MAP_ROWS} placeholder`, {
        fontSize: '10px',
        color: '#ffffff88',
      })
      .setOrigin(1, 1);
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
