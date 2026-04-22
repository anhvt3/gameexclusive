/**
 * WorldScene — ISP v1.1 Step 12
 *
 * Top-down world map. Phase 1 uses placeholder checkerboard instead of real
 * tilemap (real tileset forest_tileset_256.png pending Antigravity Batch 1).
 *
 * Player spawns at center, WASD movement with world bounds collision.
 * When real tileset arrives, replace `drawPlaceholderGrid` with `this.make.tilemap(...)`.
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';

export const WORLD_SCENE_KEY = 'WorldScene';
export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

export class WorldScene extends Phaser.Scene {
  private player: Player | null = null;

  constructor() {
    super(WORLD_SCENE_KEY);
  }

  create(): void {
    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#2a5a3a');
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.drawPlaceholderGrid(worldWidth, worldHeight);

    // Spawn player at center of map
    this.player = new Player(this, worldWidth / 2, worldHeight / 2);
  }

  update(): void {
    this.player?.update();
  }

  /**
   * TEMPORARY — placeholder checkerboard until real tileset lands.
   * Replace with `this.make.tilemap({ key: 'forest_01' })` + layer load.
   */
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
    // Dev marker for world size debugging
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
}
