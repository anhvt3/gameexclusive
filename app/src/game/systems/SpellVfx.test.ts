import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '@bus/EventBus';
import {
  wireSpellVfx,
  spellVfxSheetKey,
  SPELL_VFX_DURATION_MS,
  SPELL_VFX_PLACEHOLDER_SIZE,
} from './SpellVfx';

interface MockObj {
  x: number;
  y: number;
  destroy: ReturnType<typeof vi.fn>;
  texture?: { key: string };
  fillColor?: number;
}

interface TweenConfig {
  targets: MockObj;
  x: number;
  y: number;
  duration: number;
  ease: string;
  onComplete: () => void;
}

function makeScene(textureExists: (key: string) => boolean) {
  const created: MockObj[] = [];
  const tweens: TweenConfig[] = [];
  const scene = {
    add: {
      sprite: vi.fn((x: number, y: number, key: string): MockObj => {
        const obj: MockObj = { x, y, texture: { key }, destroy: vi.fn() };
        created.push(obj);
        return obj;
      }),
      rectangle: vi.fn((x: number, y: number, _w: number, _h: number, color: number): MockObj => {
        const obj: MockObj = { x, y, fillColor: color, destroy: vi.fn() };
        created.push(obj);
        return obj;
      }),
    },
    textures: { exists: vi.fn((key: string) => textureExists(key)) },
    tweens: {
      add: vi.fn((cfg: TweenConfig) => {
        tweens.push(cfg);
        return cfg;
      }),
    },
  };
  return { scene, created, tweens };
}

beforeEach(() => {
  eventBus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SpellVfx — wireSpellVfx', () => {
  it('subscribes to CAST_SPELL and creates placeholder when texture missing', () => {
    const { scene, created } = makeScene(() => false);
    wireSpellVfx(scene as never);

    eventBus.emit('CAST_SPELL', {
      element: 'Fire',
      origin: { x: 100, y: 200 },
      target: { x: 300, y: 200 },
    });

    expect(scene.textures.exists).toHaveBeenCalledWith(spellVfxSheetKey('Fire'));
    expect(scene.add.rectangle).toHaveBeenCalledWith(
      100,
      200,
      SPELL_VFX_PLACEHOLDER_SIZE,
      SPELL_VFX_PLACEHOLDER_SIZE,
      0xff6b35
    );
    expect(scene.add.sprite).not.toHaveBeenCalled();
    expect(created).toHaveLength(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(spellVfxSheetKey('Fire')));
  });

  it('creates sprite when texture exists (no placeholder, no warn)', () => {
    const { scene } = makeScene((key) => key === spellVfxSheetKey('Water'));
    wireSpellVfx(scene as never);

    eventBus.emit('CAST_SPELL', {
      element: 'Water',
      origin: { x: 0, y: 0 },
      target: { x: 100, y: 0 },
    });

    expect(scene.add.sprite).toHaveBeenCalledWith(0, 0, spellVfxSheetKey('Water'));
    expect(scene.add.rectangle).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('tween targets the spawned object with origin→target + correct duration', () => {
    const { scene, tweens } = makeScene(() => false);
    wireSpellVfx(scene as never);

    eventBus.emit('CAST_SPELL', {
      element: 'Plant',
      origin: { x: 50, y: 60 },
      target: { x: 250, y: 60 },
    });

    expect(tweens).toHaveLength(1);
    expect(tweens[0]!.x).toBe(250);
    expect(tweens[0]!.y).toBe(60);
    expect(tweens[0]!.duration).toBe(SPELL_VFX_DURATION_MS);
    expect(tweens[0]!.ease).toMatch(/Quad/);
  });

  it('onComplete destroys the spawned object (no leak)', () => {
    const { scene, created, tweens } = makeScene(() => false);
    wireSpellVfx(scene as never);

    eventBus.emit('CAST_SPELL', {
      element: 'Ice',
      origin: { x: 0, y: 0 },
      target: { x: 10, y: 10 },
    });
    expect(created[0]!.destroy).not.toHaveBeenCalled();
    tweens[0]!.onComplete();
    expect(created[0]!.destroy).toHaveBeenCalledTimes(1);
  });

  it('multiple emits create independent sprites + tweens', () => {
    const { scene, created, tweens } = makeScene(() => false);
    wireSpellVfx(scene as never);
    for (let i = 0; i < 3; i++) {
      eventBus.emit('CAST_SPELL', {
        element: 'Fire',
        origin: { x: i, y: 0 },
        target: { x: i + 50, y: 0 },
      });
    }
    expect(created).toHaveLength(3);
    expect(tweens).toHaveLength(3);
  });

  it('cleanup unsubscribes — subsequent emits create no objects', () => {
    const before = eventBus.getListenerCount();
    const { scene, created } = makeScene(() => false);
    const off = wireSpellVfx(scene as never);
    expect(eventBus.getListenerCount()).toBe(before + 1);
    off();
    expect(eventBus.getListenerCount()).toBe(before);
    eventBus.emit('CAST_SPELL', {
      element: 'Fire',
      origin: { x: 0, y: 0 },
      target: { x: 10, y: 10 },
    });
    expect(created).toHaveLength(0);
  });

  it('sheet-key convention is vfx_spell_<lowercase-element>', () => {
    expect(spellVfxSheetKey('Fire')).toBe('vfx_spell_fire');
    expect(spellVfxSheetKey('Astral')).toBe('vfx_spell_astral');
  });
});
