/**
 * BootScene — ISP v1.1 Step 10 (stub)
 *
 * Minimal placeholder. Step 11 will expand with asset preload pipeline.
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Game_SS3_exclusive\nbooting...', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
