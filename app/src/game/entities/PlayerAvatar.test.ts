import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveState } from '@persistence/SaveStateStore';
import type { InventoryItem } from '@/types/item';

// Capture every sprite the avatar creates so tests can inspect them.
interface MockSprite {
  x: number;
  y: number;
  texture: { key: string };
  setScale: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function makeScene(): { add: { sprite: ReturnType<typeof vi.fn> }; sprites: MockSprite[] } {
  const sprites: MockSprite[] = [];
  const add = {
    sprite: vi.fn((x: number, y: number, key: string) => {
      const s: MockSprite = {
        x,
        y,
        texture: { key },
        setScale: vi.fn().mockReturnThis(),
        setPosition: vi.fn(function (this: MockSprite, nx: number, ny: number) {
          this.x = nx;
          this.y = ny;
          return this;
        }),
        destroy: vi.fn(),
      };
      // Also need setPosition to return `this` and update coords
      s.setPosition = vi.fn((nx: number, ny: number) => {
        s.x = nx;
        s.y = ny;
        return s;
      });
      sprites.push(s);
      return s;
    }),
  };
  return { add, sprites };
}

import { PlayerAvatar } from './PlayerAvatar';

const apprenticeHat: InventoryItem = {
  instanceId: 'i-hat',
  itemId: 'hat-apprentice-01',
  acquiredAt: 1,
};
const fireHat: InventoryItem = {
  instanceId: 'i-hat-fire',
  itemId: 'hat-fire-01',
  acquiredAt: 2,
};
const fireWand: InventoryItem = {
  instanceId: 'i-wand',
  itemId: 'wand-fire-01',
  acquiredAt: 3,
};
const iceRobe: InventoryItem = {
  instanceId: 'i-robe',
  itemId: 'outfit-ice-01',
  acquiredAt: 4,
};
const apprenticeBoots: InventoryItem = {
  instanceId: 'i-shoes',
  itemId: 'shoes-apprentice-01',
  acquiredAt: 5,
};

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('PlayerAvatar — Step 22.12 layered rendering', () => {
  it('with no equipment, only the base sprite is created', () => {
    const scene = makeScene();
    const avatar = new PlayerAvatar(scene as never, 100, 200, 2);
    expect(scene.sprites).toHaveLength(1);
    expect(scene.sprites[0]!.texture.key).toBe('base_player_male');
    expect(avatar.getOverlayCount()).toBe(0);
  });

  it('equipping a hat adds one overlay sprite at the anchor offset', () => {
    const scene = makeScene();
    useSaveState.getState().addInventoryItem(apprenticeHat);
    useSaveState.getState().equipItem('hat', apprenticeHat.instanceId);
    const avatar = new PlayerAvatar(scene as never, 100, 200, 2);
    expect(avatar.getOverlayCount()).toBe(1);
    const hatSprite = scene.sprites[1]!;
    expect(hatSprite.texture.key).toBe('item_hat_apprentice_01_sprite');
    // anchor (0,-14) × scale 2 → offset (0, -28) from (100, 200)
    expect(hatSprite.x).toBe(100);
    expect(hatSprite.y).toBe(200 - 28);
  });

  it('all 4 slots equipped → 4 overlays in z-order [outfit, shoes, hat, wand]', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(iceRobe);
    s.addInventoryItem(apprenticeBoots);
    s.addInventoryItem(apprenticeHat);
    s.addInventoryItem(fireWand);
    s.equipItem('outfit', iceRobe.instanceId);
    s.equipItem('shoes', apprenticeBoots.instanceId);
    s.equipItem('hat', apprenticeHat.instanceId);
    s.equipItem('wand', fireWand.instanceId);

    const scene = makeScene();
    const avatar = new PlayerAvatar(scene as never, 0, 0, 1);

    expect(avatar.getOverlayCount()).toBe(4);
    // sprites[0] = base, then overlays in iteration order
    expect(scene.sprites[0]!.texture.key).toBe('base_player_male');
    expect(scene.sprites[1]!.texture.key).toBe('item_outfit_ice_01_sprite');
    expect(scene.sprites[2]!.texture.key).toBe('item_shoes_apprentice_01_sprite');
    expect(scene.sprites[3]!.texture.key).toBe('item_hat_apprentice_01_sprite');
    expect(scene.sprites[4]!.texture.key).toBe('item_wand_fire_01_sprite');
  });

  it('unequipping after construction destroys that overlay sprite', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(apprenticeHat);
    s.equipItem('hat', apprenticeHat.instanceId);
    const scene = makeScene();
    const avatar = new PlayerAvatar(scene as never, 0, 0, 1);
    const hatSprite = scene.sprites[1]!;
    expect(avatar.getOverlayCount()).toBe(1);
    s.unequipItem('hat');
    expect(hatSprite.destroy).toHaveBeenCalledTimes(1);
    expect(avatar.getOverlayCount()).toBe(0);
  });

  it('swapping items in the same slot destroys the old sprite and adds a new one', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(apprenticeHat);
    s.addInventoryItem(fireHat);
    s.equipItem('hat', apprenticeHat.instanceId);
    const scene = makeScene();
    new PlayerAvatar(scene as never, 0, 0, 1);
    const oldHat = scene.sprites[1]!;
    s.equipItem('hat', fireHat.instanceId);
    expect(oldHat.destroy).toHaveBeenCalledTimes(1);
    // New sprite added with fire hat texture
    const last = scene.sprites[scene.sprites.length - 1]!;
    expect(last.texture.key).toBe('item_hat_fire_01_sprite');
  });

  it('destroy() tears down base + every overlay + unsubscribes from SaveState', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(apprenticeHat);
    s.equipItem('hat', apprenticeHat.instanceId);
    const scene = makeScene();
    const avatar = new PlayerAvatar(scene as never, 0, 0, 1);
    const base = scene.sprites[0]!;
    const hat = scene.sprites[1]!;
    avatar.destroy();
    expect(base.destroy).toHaveBeenCalled();
    expect(hat.destroy).toHaveBeenCalled();
    // After destroy, equipping new items should NOT spawn more sprites
    const sceneSpriteCount = scene.sprites.length;
    s.addInventoryItem(fireHat);
    s.equipItem('hat', fireHat.instanceId);
    expect(scene.sprites.length).toBe(sceneSpriteCount);
  });

  it('anchor offsets match Appendix H §H.0 table', () => {
    const scene = makeScene();
    const avatar = new PlayerAvatar(scene as never, 0, 0, 1);
    // (origin 0.5 normalised) — values below are the doc-recentered offsets
    expect(avatar.getAnchorOffset('hat')).toEqual({ x: 0, y: -14 });
    expect(avatar.getAnchorOffset('outfit')).toEqual({ x: 0, y: 2 });
    expect(avatar.getAnchorOffset('wand')).toEqual({ x: 6, y: 0 });
    expect(avatar.getAnchorOffset('shoes')).toEqual({ x: 0, y: 14 });
  });
});
