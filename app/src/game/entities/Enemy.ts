/**
 * Enemy entity — ISP v1.1 Step 13
 *
 * Placeholder: colored rectangle tinted by element until sprite assets arrive.
 * When spritePath loaded, swap to Phaser.GameObjects.Sprite.
 *
 * Carries monsterId + currentHp for combat handoff via EventBus.
 */

import type Phaser from 'phaser';
import type { MonsterDef } from '@data/staticConfig/monsters';

export const ENEMY_SIZE = 32;

export class Enemy {
  public sprite: Phaser.GameObjects.Rectangle;
  public body: Phaser.Physics.Arcade.Body;
  public readonly def: MonsterDef;
  public currentHp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef) {
    this.def = def;
    this.currentHp = def.baseHp;
    this.sprite = scene.add.rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, def.placeholderColor);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true);
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
