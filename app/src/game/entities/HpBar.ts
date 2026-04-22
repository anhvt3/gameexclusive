/**
 * HpBar — ISP v1.1 Step 14
 *
 * Phaser GameObject rendering an HP bar (bg + fill + label).
 * Reactive: call setHp(current, max) to update fill width + label.
 *
 * Placeholder primitives (rectangles + text) — can swap to preloaded
 * hp_bar_{empty,100,50,20} images in later polish step.
 */

import type Phaser from 'phaser';

export const HP_BAR_WIDTH = 240;
export const HP_BAR_HEIGHT = 24;
export const HP_COLOR_HIGH = 0x4caf50;
export const HP_COLOR_MID = 0xffc107;
export const HP_COLOR_LOW = 0xf44336;

export class HpBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private current: number;
  private max: number;

  constructor(scene: Phaser.Scene, x: number, y: number, current: number, max: number) {
    this.current = current;
    this.max = max;

    this.bg = scene.add.rectangle(x, y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x222222);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setStrokeStyle(2, 0xffffff);

    this.fill = scene.add.rectangle(
      x - HP_BAR_WIDTH / 2,
      y,
      HP_BAR_WIDTH,
      HP_BAR_HEIGHT - 4,
      HP_COLOR_HIGH
    );
    this.fill.setOrigin(0, 0.5);

    this.label = scene.add.text(x, y, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5, 0.5);

    this.render();
  }

  setHp(current: number, max?: number): void {
    this.current = Math.max(0, Math.min(current, max ?? this.max));
    if (max !== undefined) this.max = max;
    this.render();
  }

  private render(): void {
    const ratio = this.max > 0 ? this.current / this.max : 0;
    this.fill.width = (HP_BAR_WIDTH - 4) * ratio;
    this.fill.fillColor = this.pickColor(ratio);
    this.label.setText(`${Math.round(this.current)} / ${this.max}`);
  }

  private pickColor(ratio: number): number {
    if (ratio > 0.5) return HP_COLOR_HIGH;
    if (ratio > 0.2) return HP_COLOR_MID;
    return HP_COLOR_LOW;
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
    this.label.destroy();
  }

  getCurrent(): number {
    return this.current;
  }

  getMax(): number {
    return this.max;
  }
}
