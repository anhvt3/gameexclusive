/**
 * Player entity — ISP v1.1 Step 12
 *
 * Top-down 4-direction Arcade Physics player.
 * Placeholder visual: orange rectangle (32×48) until wizard spritesheet
 * delivered by Antigravity Batch 1 (F.1.1).
 *
 * Input: WASD keys. Diagonal movement supported (no normalization in Phase 1).
 *
 * World bounds collision auto-enabled.
 */

import type Phaser from 'phaser';

export const PLAYER_SPEED = 160;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const PLAYER_COLOR_PLACEHOLDER = 0xd4691e;

export interface PlayerKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export class Player {
  public sprite: Phaser.GameObjects.Rectangle;
  public body: Phaser.Physics.Arcade.Body;
  public keys: PlayerKeys;
  public speed: number = PLAYER_SPEED;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_COLOR_PLACEHOLDER);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);

    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error('[Player] scene.input.keyboard is null — enable keyboard input');
    }
    this.keys = kb.addKeys('W,A,S,D') as unknown as PlayerKeys;
  }

  update(): void {
    this.body.setVelocity(0, 0);

    if (this.keys.A.isDown) this.body.setVelocityX(-this.speed);
    else if (this.keys.D.isDown) this.body.setVelocityX(this.speed);

    if (this.keys.W.isDown) this.body.setVelocityY(-this.speed);
    else if (this.keys.S.isDown) this.body.setVelocityY(this.speed);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
