/**
 * WorldScene — ISP v1.1 Step 11 (stub)
 *
 * Empty world scene with background color only.
 * Step 12 will add tilemap + player + movement.
 */

import Phaser from 'phaser';

export const WORLD_SCENE_KEY = 'WorldScene';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super(WORLD_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2a5a3a');
    this.add
      .text(width / 2, height / 2, 'WorldScene stub\n(Step 12 sẽ thêm tilemap)', {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
