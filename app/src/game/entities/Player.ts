/**
 * Player entity — ISP v1.1 Step 12
 *
 * Top-down 4-direction Arcade Physics player. Renders the wizard_walk
 * spritesheet (frame 0 = idle facing-down) when the texture is loaded;
 * falls back to a placeholder rectangle when running under unit tests
 * that don't preload Phaser textures.
 *
 * Input: WASD keys. Diagonal movement supported (no normalization in Phase 1).
 *
 * World bounds collision auto-enabled.
 *
 * Audio (ISP 22.11): footstep SFX `world_step_grass` plays at most once per
 * PLAYER_STEP_INTERVAL_MS while a movement key is held. Detection uses key
 * state (independent of physics body fields so unit-test mocks without
 * `body.velocity` keep working).
 */

import type Phaser from 'phaser';
import { audioManager } from '@/utils/AudioManager';

export const PLAYER_SPEED = 160;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const PLAYER_COLOR_PLACEHOLDER = 0xd4691e;
/** Preferred world-sprite key — falls through to wizard_walk then placeholder. */
export const PLAYER_SPRITE_KEY = 'base_player_male';
export const PLAYER_SPRITE_FALLBACK_KEY = 'wizard_walk';
/** Min ms between footstep SFX while moving — tuned for tile-pace cadence. */
export const PLAYER_STEP_INTERVAL_MS = 350;

export interface PlayerKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export class Player {
  public sprite: Phaser.GameObjects.GameObject & {
    x: number;
    y: number;
    body: Phaser.Physics.Arcade.Body | null;
  };
  public body: Phaser.Physics.Arcade.Body;
  public keys: PlayerKeys;
  public speed: number = PLAYER_SPEED;
  /** Last footstep SFX timestamp (ms since epoch). Throttles step playback. */
  private lastStepAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex =
      scene.textures && typeof scene.textures.exists === 'function'
        ? scene.textures.exists(PLAYER_SPRITE_KEY)
          ? PLAYER_SPRITE_KEY
          : scene.textures.exists(PLAYER_SPRITE_FALLBACK_KEY)
            ? PLAYER_SPRITE_FALLBACK_KEY
            : null
        : null;
    if (tex) {
      const img =
        tex === PLAYER_SPRITE_FALLBACK_KEY
          ? scene.add.sprite(x, y, tex, 0)
          : scene.add.sprite(x, y, tex);
      img.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
      this.sprite = img as unknown as typeof this.sprite;
    } else {
      this.sprite = scene.add.rectangle(
        x,
        y,
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
        PLAYER_COLOR_PLACEHOLDER
      ) as unknown as typeof this.sprite;
    }
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    if (typeof this.body.setSize === 'function') {
      this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    }

    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error('[Player] scene.input.keyboard is null — enable keyboard input');
    }
    this.keys = kb.addKeys('W,A,S,D') as unknown as PlayerKeys;
  }

  update(): void {
    this.body.setVelocity(0, 0);

    const movingX = this.keys.A.isDown || this.keys.D.isDown;
    const movingY = this.keys.W.isDown || this.keys.S.isDown;

    if (this.keys.A.isDown) this.body.setVelocityX(-this.speed);
    else if (this.keys.D.isDown) this.body.setVelocityX(this.speed);

    if (this.keys.W.isDown) this.body.setVelocityY(-this.speed);
    else if (this.keys.S.isDown) this.body.setVelocityY(this.speed);

    if (movingX || movingY) {
      const now = Date.now();
      if (now - this.lastStepAt >= PLAYER_STEP_INTERVAL_MS) {
        audioManager.playSfx('world_step_grass');
        this.lastStepAt = now;
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
