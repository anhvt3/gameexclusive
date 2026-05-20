/**
 * PlayerAvatar — ISP v1.1 Step 22.12 / Appendix I §1.1.
 *
 * Composes a base body sprite + up to 4 equipment overlay sprites
 * (outfit / shoes / hat / wand) into a single logical actor pinned at
 * (x, y). Subscribes to SaveStateStore so equip/unequip from the
 * inventory UI repaints the layers in real time without scene reload.
 *
 * Z-order matches Appendix I render-stack note:
 *   Base (0) → Outfit (1) → Shoes (2) → Hat (3) → Wand (4)
 *
 * Anchor offsets are expressed in base-32 sprite coordinates and scaled
 * by the avatar's scale factor at placement time. Values come from
 * Appendix H §H.0 anchor table, recentered around the sprite midpoint
 * (Phaser sprites default to origin 0.5).
 */

import type Phaser from 'phaser';
import { useSaveState } from '@persistence/SaveStateStore';
import { findItemDef } from '@data/staticConfig/items';
import { type EquipmentSlot } from '@/types/item';

/** Texture key registered by PreloadScene for the base body sprite. */
export const PLAYER_BASE_MALE_KEY = 'base_player_male';

/** Render order — later entries draw on top. */
const OVERLAY_ORDER: readonly EquipmentSlot[] = ['outfit', 'shoes', 'hat', 'wand'];

/**
 * Per-slot offset in base-32 sprite coords, recentered around (0,0)
 * because Phaser origins default to 0.5 (sprite midpoint). Multiply
 * by `scale` to get pixel offset from the avatar pin.
 */
const ANCHOR_OFFSETS: Record<EquipmentSlot, { x: number; y: number }> = {
  hat: { x: 0, y: -14 },
  outfit: { x: 0, y: 2 },
  wand: { x: 6, y: 0 },
  shoes: { x: 0, y: 14 },
};

export class PlayerAvatar {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private scale: number;
  /** B-08: when true, base + all overlays are mirrored horizontally so the
   * hero can face left toward the monster in CombatScene (player anchored
   * on the right side of the viewport). Anchor offsets X-flip too so
   * equipment stays aligned with the (now-mirrored) body. */
  private flipX: boolean;
  private base: Phaser.GameObjects.Sprite;
  private overlays = new Map<EquipmentSlot, Phaser.GameObjects.Sprite>();
  private unsub: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 2, flipX = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.flipX = flipX;
    // Crop to top-left 512x512 (frame 0) — see B-04 in Player.ts:
    // base_player_male_transparent.png is a 6-wizard reference sheet, not
    // a single character. Without crop, this renders all 6 wizards.
    this.base = scene.add.sprite(x, y, PLAYER_BASE_MALE_KEY);
    this.base.setCrop?.(0, 0, 512, 512);
    this.base.setScale(scale);
    this.base.setFlipX?.(this.flipX);
    this.syncOverlays();
    this.unsub = useSaveState.subscribe(() => this.syncOverlays());
  }

  /**
   * Reconcile rendered overlays against current SaveState equipment.
   * Cheap: each call iterates the 4 slots, updates only the deltas.
   */
  private syncOverlays(): void {
    const state = useSaveState.getState();
    for (const slot of OVERLAY_ORDER) {
      const instanceId = state.equipment[slot];
      const inst = instanceId ? state.inventory.find((i) => i.instanceId === instanceId) : null;
      const def = inst ? findItemDef(inst.itemId) : undefined;
      const existing = this.overlays.get(slot);

      if (def) {
        const offset = ANCHOR_OFFSETS[slot];
        // B-08: flip the X offset when the avatar faces left so e.g. the
        // wand stays in the (now-left) hand instead of jumping to the
        // wrong side. Y offset stays put (vertical anchors don't mirror).
        const ox = this.x + (this.flipX ? -offset.x : offset.x) * this.scale;
        const oy = this.y + offset.y * this.scale;
        if (existing && existing.texture.key === def.spriteKey) {
          existing.setPosition(ox, oy);
          existing.setFlipX?.(this.flipX);
        } else {
          existing?.destroy();
          const sprite = this.scene.add.sprite(ox, oy, def.spriteKey).setScale(this.scale);
          sprite.setFlipX?.(this.flipX);
          this.overlays.set(slot, sprite);
        }
      } else if (existing) {
        existing.destroy();
        this.overlays.delete(slot);
      }
    }
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    this.base.destroy();
    for (const sprite of this.overlays.values()) sprite.destroy();
    this.overlays.clear();
  }

  /* ------ Test-only accessors ------ */
  getBaseSprite(): Phaser.GameObjects.Sprite {
    return this.base;
  }
  getOverlays(): ReadonlyMap<EquipmentSlot, Phaser.GameObjects.Sprite> {
    return this.overlays;
  }
  getOverlayCount(): number {
    return this.overlays.size;
  }
  getAnchorOffset(slot: EquipmentSlot): { x: number; y: number } {
    return ANCHOR_OFFSETS[slot];
  }
}
