/**
 * Enemy entity — ISP v1.1 Step 13
 *
 * Renders the monster's `idle` PNG (`monster_<codename>_idle`) when the
 * texture is loaded; falls back to a coloured rectangle in unit tests
 * or when an asset is missing. Carries monsterId + currentHp for combat
 * handoff via EventBus.
 */

import type Phaser from 'phaser';
import type { MonsterDef } from '@data/staticConfig/monsters';

export const ENEMY_SIZE = 72;

export class Enemy {
  public sprite: Phaser.GameObjects.GameObject & {
    x: number;
    y: number;
    body: Phaser.Physics.Arcade.Body | null;
    setData: (k: string, v: unknown) => unknown;
    getData: (k: string) => unknown;
    destroy: () => void;
  };
  public body: Phaser.Physics.Arcade.Body;
  public readonly def: MonsterDef;
  public currentHp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef) {
    this.def = def;
    this.currentHp = def.baseHp;
    const textureKey = `monster_${def.codename}_idle`;
    const hasTexture =
      scene.textures && typeof scene.textures.exists === 'function'
        ? scene.textures.exists(textureKey)
        : false;
    if (hasTexture) {
      const img = scene.add.sprite(x, y, textureKey);
      img.setDisplaySize(ENEMY_SIZE, ENEMY_SIZE);
      this.sprite = img as unknown as typeof this.sprite;
    } else {
      this.sprite = scene.add.rectangle(
        x,
        y,
        ENEMY_SIZE,
        ENEMY_SIZE,
        def.placeholderColor
      ) as unknown as typeof this.sprite;
    }
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true);
    if (typeof this.body.setSize === 'function') {
      this.body.setSize(ENEMY_SIZE, ENEMY_SIZE);
    }
    // Store back-ref on sprite.data for easy retrieval from overlap callbacks
    this.sprite.setData('enemy', this);
  }

  get monsterId(): number {
    return this.def.id;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
