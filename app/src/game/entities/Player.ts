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

export const PLAYER_SPEED = 200;
// B-07: bumped from 64x80 to 128x160 — anh reported player looked tí hon
// (~30px on a 1280-wide background). 2x size matches the monster sprite
// rendering scale + keeps walking-path collisions sane.
export const PLAYER_WIDTH = 128;
export const PLAYER_HEIGHT = 160;
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
  /** Arrow-key fallbacks — Vietnamese keyboard layouts / IME modes can
   * intercept WASD letter keys. Arrow keys are layout-independent. */
  UP: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
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
  /** Sprint E Task 7b — hair overlay sprite (layered above base body). */
  private hairSprite: Phaser.GameObjects.Sprite | null = null;
  /** Reference to scene retained for late overlay attachment (setHairOverlay). */
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
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

      // ROOT CAUSE B-04: base_player_male_transparent.png is a 1024x1024
      // "character reference sheet" with 6 wizards baked into 1 image (2
      // figures top half + 4 figures bottom half). Antigravity shipped a
      // concept sheet, not a game sprite. Without cropping, setScale renders
      // all 6 wizards stacked at the player position.
      //
      // Workaround until Antigravity round-2: crop to the top-left wizard
      // (front-facing idle pose) which occupies roughly the top-left 512x512
      // quadrant. setCrop(x, y, w, h) is in unscaled texture pixels.
      if (tex === PLAYER_SPRITE_KEY) {
        img.setCrop?.(0, 0, 512, 512);
        img.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
      } else {
        img.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
      }
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
    // Default body size matches display size (64x80) after setDisplaySize +
    // setCrop above — no manual setSize/setOffset needed.

    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error('[Player] scene.input.keyboard is null — enable keyboard input');
    }
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as unknown as PlayerKeys;
  }

  update(): void {
    this.body.setVelocity(0, 0);

    const left = this.keys.A.isDown || this.keys.LEFT.isDown;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown;
    const up = this.keys.W.isDown || this.keys.UP.isDown;
    const down = this.keys.S.isDown || this.keys.DOWN.isDown;
    const movingX = left || right;
    const movingY = up || down;

    if (left) this.body.setVelocityX(-this.speed);
    else if (right) this.body.setVelocityX(this.speed);

    if (up) this.body.setVelocityY(-this.speed);
    else if (down) this.body.setVelocityY(this.speed);

    if (movingX || movingY) {
      const now = Date.now();
      if (now - this.lastStepAt >= PLAYER_STEP_INTERVAL_MS) {
        audioManager.playSfx('world_step_grass');
        this.lastStepAt = now;
      }
    }
  }

  /**
   * Sprint E Task 7b — attach a hair overlay sprite atop the base player body.
   *
   * Mirrors the equipment-overlay seam pattern (Phase 1.5 / Appendix H) but is
   * the first overlay slot to land on Player.ts directly. Safe to call multiple
   * times — the previous overlay is destroyed before a new one is added.
   *
   * In unit-test mode (no scene.textures / scene.add.sprite), this is a no-op
   * so callers (CustomizationPicker apply path, e.g.) can invoke unconditionally.
   */
  setHairOverlay(textureKey: string): void {
    if (this.hairSprite) {
      this.hairSprite.destroy?.();
      this.hairSprite = null;
    }
    if (!this.scene) return;
    const textures = (this.scene as Phaser.Scene).textures;
    const texturesOk =
      textures && typeof textures.exists === 'function' && textures.exists(textureKey);
    if (!texturesOk) return;
    const addSprite = (this.scene.add as Phaser.GameObjects.GameObjectFactory)?.sprite;
    if (typeof addSprite !== 'function') return;
    const overlay = this.scene.add.sprite(this.sprite.x, this.sprite.y, textureKey);
    overlay.setDisplaySize?.(PLAYER_WIDTH, PLAYER_HEIGHT);
    const baseDepth = (this.sprite as unknown as { depth?: number }).depth ?? 0;
    overlay.setDepth?.(baseDepth + 1);
    this.hairSprite = overlay;
  }

  destroy(): void {
    if (this.hairSprite) {
      this.hairSprite.destroy?.();
      this.hairSprite = null;
    }
    this.sprite.destroy();
  }
}
