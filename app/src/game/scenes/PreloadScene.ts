/**
 * PreloadScene — ISP v1.1 Step 11
 *
 * Loads essential Phase 1 assets with progress bar UI.
 * On complete: transition to WorldScene.
 *
 * Assets loaded here are MINIMUM for harness validation.
 * Full asset manifest (5 monsters + mascot + tileset) expands in Step 12+
 * once Antigravity delivers per batch_plan_v2.
 */

import Phaser from 'phaser';

export const PRELOAD_SCENE_KEY = 'PreloadScene';

/**
 * Phase 1 minimum asset manifest.
 * Replaced with real paths as Antigravity delivers (batch_plan_v2_antigravity.md).
 */
export const PHASE1_ASSETS = {
  images: [] as Array<{ key: string; path: string }>,
  spritesheets: [] as Array<{
    key: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
  }>,
  tilemaps: [] as Array<{ key: string; path: string }>,
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(PRELOAD_SCENE_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;

    // Progress bar primitives
    const barWidth = 400;
    const barHeight = 20;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 - barHeight / 2;

    const bg = this.add.rectangle(width / 2, barY + barHeight / 2, barWidth, barHeight, 0x222244);
    const fill = this.add.rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xd4691e);
    fill.setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, barY - 24, 'Đang tải...', { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });

    this.load.once('complete', () => {
      bg.destroy();
      fill.destroy();
      label.destroy();
    });

    // Register asset loads (manifest may be empty in Phase 1 setup — that's OK)
    for (const img of PHASE1_ASSETS.images) {
      this.load.image(img.key, img.path);
    }
    for (const sheet of PHASE1_ASSETS.spritesheets) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const map of PHASE1_ASSETS.tilemaps) {
      this.load.tilemapTiledJSON(map.key, map.path);
    }
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
