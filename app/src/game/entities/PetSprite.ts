/**
 * PetSprite — Sprint A pet rendering with 4 animation states.
 *
 * Uses textures `pet_<codename>_<state>` preloaded by PreloadScene
 * (see Task 12). Falls back to a coloured placeholder rectangle when a
 * texture isn't loaded, so unit tests run headless.
 */

import type Phaser from 'phaser';
import type { PetDef } from '@data/staticConfig/pets';

export type PetAnimState = 'idle' | 'attack' | 'hurt' | 'death';
export const PET_SPRITE_DISPLAY = { width: 96, height: 96 } as const;
const PLACEHOLDER_COLOR = 0x66cc66;

export class PetSprite {
  private scene: Phaser.Scene;
  private codename: PetDef['codename'];
  private node:
    | (Phaser.GameObjects.Sprite & { setTexture: (k: string) => Phaser.GameObjects.Sprite })
    | Phaser.GameObjects.Rectangle;
  private state: PetAnimState = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number, codename: PetDef['codename']) {
    this.scene = scene;
    this.codename = codename;
    const idleKey = `pet_${codename}_idle`;
    const has =
      scene.textures && typeof scene.textures.exists === 'function'
        ? scene.textures.exists(idleKey)
        : false;
    if (has) {
      const s = scene.add.sprite(x, y, idleKey) as Phaser.GameObjects.Sprite;
      s.setDisplaySize(PET_SPRITE_DISPLAY.width, PET_SPRITE_DISPLAY.height);
      this.node = s as never;
    } else {
      this.node = scene.add.rectangle(
        x,
        y,
        PET_SPRITE_DISPLAY.width,
        PET_SPRITE_DISPLAY.height,
        PLACEHOLDER_COLOR
      );
    }
  }

  setState(s: PetAnimState): void {
    if (s === this.state) return;
    this.state = s;
    const key = `pet_${this.codename}_${s}`;
    const has = this.scene.textures?.exists?.(key);
    if (has && 'setTexture' in this.node && typeof this.node.setTexture === 'function') {
      (this.node as Phaser.GameObjects.Sprite).setTexture(key);
    }
  }

  destroy(): void {
    this.node.destroy();
  }

  getX(): number {
    return (this.node as { x: number }).x;
  }
  getY(): number {
    return (this.node as { y: number }).y;
  }
}
