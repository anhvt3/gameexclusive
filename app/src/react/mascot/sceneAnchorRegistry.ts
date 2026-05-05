/**
 * sceneAnchorRegistry — global lookup table for Phaser scene anchor
 * coordinates referenced by tutorial gesture overlays.
 *
 * Phaser scenes register anchors at create() (e.g., 'WorldScene:enemy').
 * TutorialArrow.tsx (React, no Phaser import) reads coordinates here
 * and offsets by canvas getBoundingClientRect to position the DOM
 * arrow overlay correctly.
 *
 * No Phaser/React/DOM imports — pure mutable map for cross-layer
 * coordinate sharing.
 */

const anchors = new Map<string, { x: number; y: number }>();

export function registerSceneAnchor(selector: string, coords: { x: number; y: number }): void {
  anchors.set(selector, coords);
}

export function readSceneAnchor(selector: string): { x: number; y: number } | null {
  return anchors.get(selector) ?? null;
}

export function clearSceneAnchors(): void {
  anchors.clear();
}
