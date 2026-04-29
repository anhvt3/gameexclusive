import { describe, expect, it, vi } from 'vitest';
import { PetSprite, PET_SPRITE_DISPLAY } from './PetSprite';

function mockScene(textureKeys: string[] = []) {
  return {
    add: {
      sprite: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis(),
        setTexture: vi.fn().mockReturnThis(),
        x: 0,
        y: 0,
        destroy: vi.fn(),
      }),
      rectangle: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), destroy: vi.fn() }),
    },
    textures: {
      exists: (k: string) => textureKeys.includes(k),
    },
  };
}

describe('PetSprite — Sprint A', () => {
  it('uses idle texture when codename texture exists', () => {
    const scene = mockScene(['pet_bunbleaf_idle']);
    new PetSprite(scene as never, 100, 200, 'bunbleaf');
    expect(scene.add.sprite).toHaveBeenCalledWith(100, 200, 'pet_bunbleaf_idle');
  });

  it('falls back to placeholder rectangle when texture missing', () => {
    const scene = mockScene([]);
    new PetSprite(scene as never, 50, 60, 'bunbleaf');
    expect(scene.add.rectangle).toHaveBeenCalled();
  });

  it('setState(attack) swaps texture to attack variant', () => {
    const scene = mockScene(['pet_bunbleaf_idle', 'pet_bunbleaf_attack']);
    const sprite = new PetSprite(scene as never, 0, 0, 'bunbleaf');
    sprite.setState('attack');
    const lastSprite = (scene.add.sprite as ReturnType<typeof vi.fn>).mock.results[0]!.value;
    expect(lastSprite.setTexture).toHaveBeenCalledWith('pet_bunbleaf_attack');
  });

  it('display size matches PET_SPRITE_DISPLAY constant', () => {
    expect(PET_SPRITE_DISPLAY).toEqual({ width: 96, height: 96 });
  });
});
