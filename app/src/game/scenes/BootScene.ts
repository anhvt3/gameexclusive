/**
 * BootScene — ISP v1.1 Step 11
 *
 * First scene: minimal config setup, then transition to PreloadScene.
 * No asset loads here (PreloadScene handles that with progress bar).
 */

import Phaser from 'phaser';

export const BOOT_SCENE_KEY = 'BootScene';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    // Background color is set in game config; nothing to do at boot except transition.
    this.scene.start('PreloadScene');
  }
}
