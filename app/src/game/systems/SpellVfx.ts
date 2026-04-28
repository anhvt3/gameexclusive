/**
 * SpellVfx — ISP v1.1 Step 22.13 / Appendix I §1.2.
 *
 * Cosmetic-only spell-cast animation. Listens for CAST_SPELL on the
 * EventBus and tweens a small element-coloured object from origin to
 * target, then destroys it. The FSM in CombatStateMachine never sees
 * this — combat resolution is unaffected so the visual layer is pure
 * juice that can ship/be removed in isolation.
 *
 * Phase 1 placeholder: when an element-specific sprite-sheet is not
 * registered yet (textures.exists returns false), we render a small
 * coloured rectangle in the brand palette. Phase 2 Antigravity drop
 * will replace each placeholder with the real per-element beam +
 * impact sheet without code changes — wireSpellVfx automatically
 * uses the sprite path once the asset key is preloaded.
 */

import type Phaser from 'phaser';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import type { Element } from '@/types/element';

/** Texture-key convention for the per-element VFX sprite-sheet. */
export const spellVfxSheetKey = (element: Element): string => `vfx_spell_${element.toLowerCase()}`;

/** Brand-aligned placeholder colours (match monsters.ts ELEMENT_COLORS). */
const ELEMENT_PLACEHOLDER: Record<Element, number> = {
  Fire: 0xff6b35,
  Water: 0x00b4d8,
  Earth: 0x774936,
  Ice: 0xcaf0f8,
  Storm: 0xffd60a,
  Plant: 0x7cb342,
  Shadow: 0x10002b,
  Astral: 0x7209b7,
};

export const SPELL_VFX_DURATION_MS = 400;
export const SPELL_VFX_PLACEHOLDER_SIZE = 24;

interface DestroyableObject {
  destroy: () => void;
}

/**
 * Subscribe to CAST_SPELL events and animate one VFX object per emit
 * inside the given Phaser scene. Returns a cleanup function — wire
 * this from CombatScene.create() and call it from shutdown().
 */
export function wireSpellVfx(scene: Phaser.Scene): Unsubscribe {
  return eventBus.on('CAST_SPELL', ({ element, origin, target }) => {
    const sheetKey = spellVfxSheetKey(element);
    const hasSheet =
      scene.textures && typeof scene.textures.exists === 'function'
        ? scene.textures.exists(sheetKey)
        : false;

    let obj: DestroyableObject;
    if (hasSheet) {
      obj = scene.add.sprite(origin.x, origin.y, sheetKey) as unknown as DestroyableObject;
    } else {
      // Brand-coloured square as a stand-in until Antigravity drops the real sheet.
      console.warn(`[SpellVfx] missing texture "${sheetKey}" — using placeholder`);
      obj = scene.add.rectangle(
        origin.x,
        origin.y,
        SPELL_VFX_PLACEHOLDER_SIZE,
        SPELL_VFX_PLACEHOLDER_SIZE,
        ELEMENT_PLACEHOLDER[element]
      ) as unknown as DestroyableObject;
    }

    scene.tweens.add({
      targets: obj,
      x: target.x,
      y: target.y,
      duration: SPELL_VFX_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => obj.destroy(),
    });
  });
}
