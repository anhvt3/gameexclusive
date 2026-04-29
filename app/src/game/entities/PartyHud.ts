/**
 * PartyHud — Sprint A multi-entity HP strip.
 *
 * Renders a 240×80 HP strip per CombatEntity. Allies stack bottom-left,
 * enemies stack top-right. The strip background asset
 * `assets/ui/party_hp_strip_bg.png` is preloaded by PreloadScene.
 *
 * Usage:
 *   const hud = new PartyHud(scene, entities);
 *   hud.updateHp(entity.id, newHp, maxHp);
 *   hud.highlight(currentActor.id);
 *   hud.destroy();  // call from scene.shutdown
 */

import type Phaser from 'phaser';
import type { CombatEntity } from '@/types/combat';

const STRIP_WIDTH = 240;
const STRIP_HEIGHT = 80;
const HP_BAR_W = 200;
const HP_BAR_H = 12;
const SLOT_GAP = 12;

interface SlotHandles {
  bg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  highlightRing: Phaser.GameObjects.Rectangle;
}

export class PartyHud {
  private scene: Phaser.Scene;
  private slots = new Map<string, SlotHandles>();

  constructor(scene: Phaser.Scene, entities: CombatEntity[]) {
    this.scene = scene;
    const { width, height } = scene.scale;
    let allyIdx = 0;
    let enemyIdx = 0;
    for (const e of entities) {
      const x = e.faction === 'ally' ? 20 + STRIP_WIDTH / 2 : width - STRIP_WIDTH / 2 - 20;
      const baseY =
        e.faction === 'ally'
          ? height - 100 - allyIdx * (STRIP_HEIGHT + SLOT_GAP)
          : 60 + enemyIdx * (STRIP_HEIGHT + SLOT_GAP);
      this.slots.set(e.id, this.buildSlot(e, x, baseY));
      if (e.faction === 'ally') allyIdx++;
      else enemyIdx++;
    }
  }

  private buildSlot(e: CombatEntity, x: number, y: number): SlotHandles {
    const bg = this.scene.add.rectangle(x, y, STRIP_WIDTH, STRIP_HEIGHT, 0xfaf3e0);
    bg.setStrokeStyle(2, 0x8b4513);
    const nameText = this.scene.add.text(
      x - STRIP_WIDTH / 2 + 12,
      y - STRIP_HEIGHT / 2 + 8,
      `${e.name} Lv${e.level}`,
      { fontSize: '14px', color: '#3d2510', fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0);
    const hpFill = this.scene.add.rectangle(x - HP_BAR_W / 2, y + 14, HP_BAR_W, HP_BAR_H, 0x4caf50);
    hpFill.setOrigin(0, 0.5);
    const hpText = this.scene.add
      .text(x, y + 14, `${e.hp}/${e.maxHp}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);
    const highlightRing = this.scene.add.rectangle(
      x,
      y,
      STRIP_WIDTH + 6,
      STRIP_HEIGHT + 6,
      0x000000,
      0
    );
    highlightRing.setStrokeStyle(0, 0xffd700);
    highlightRing.setOrigin(0.5, 0.5);
    return { bg, hpFill, nameText, hpText, highlightRing };
  }

  updateHp(entityId: string, hp: number, maxHp: number): void {
    const slot = this.slots.get(entityId);
    if (!slot) return;
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    slot.hpFill.width = HP_BAR_W * ratio;
    slot.hpFill.fillColor = ratio > 0.6 ? 0x4caf50 : ratio > 0.3 ? 0xfbc02d : 0xe53935;
    slot.hpText.setText(`${Math.max(0, hp)}/${maxHp}`);
  }

  highlight(entityId: string | null): void {
    for (const [id, slot] of this.slots) {
      const visible = id === entityId;
      slot.highlightRing.setStrokeStyle(visible ? 3 : 0, 0xffd700);
    }
  }

  destroy(): void {
    for (const slot of this.slots.values()) {
      slot.bg.destroy();
      slot.hpFill.destroy();
      slot.nameText.destroy();
      slot.hpText.destroy();
      slot.highlightRing.destroy();
    }
    this.slots.clear();
  }
}
