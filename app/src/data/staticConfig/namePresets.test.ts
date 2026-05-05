import { describe, expect, it } from 'vitest';
import { NAME_PRESETS, randomPreset } from './namePresets';

describe('NAME_PRESETS', () => {
  it('declares exactly 12 presets', () => {
    expect(NAME_PRESETS).toHaveLength(12);
  });

  it('partitions into 6 male + 6 female', () => {
    expect(NAME_PRESETS.filter((p) => p.gender === 'male')).toHaveLength(6);
    expect(NAME_PRESETS.filter((p) => p.gender === 'female')).toHaveLength(6);
  });

  it('uses unique names', () => {
    const names = NAME_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('male presets are Minh, Nam, Bảo, Khải, An, Khoa', () => {
    const males = NAME_PRESETS.filter((p) => p.gender === 'male').map((p) => p.name);
    expect(males).toEqual(['Minh', 'Nam', 'Bảo', 'Khải', 'An', 'Khoa']);
  });

  it('female presets are Linh, Hương, Trang, Mai, Vy, Châu', () => {
    const females = NAME_PRESETS.filter((p) => p.gender === 'female').map((p) => p.name);
    expect(females).toEqual(['Linh', 'Hương', 'Trang', 'Mai', 'Vy', 'Châu']);
  });
});

describe('randomPreset', () => {
  it('rng=0 returns first preset (Minh)', () => {
    expect(randomPreset(() => 0).name).toBe('Minh');
  });

  it('rng=0.999 returns last preset (Châu)', () => {
    expect(randomPreset(() => 0.999).name).toBe('Châu');
  });

  it('rng=0.5 returns mid preset', () => {
    const mid = randomPreset(() => 0.5);
    expect(NAME_PRESETS).toContainEqual(mid);
  });

  it('always returns a valid preset (never null)', () => {
    for (let i = 0; i < 20; i++) {
      const p = randomPreset(() => i / 20);
      expect(NAME_PRESETS).toContainEqual(p);
    }
  });
});
