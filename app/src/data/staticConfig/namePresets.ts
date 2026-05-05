import type { Gender } from '@/types/identity';

export interface NamePreset {
  readonly name: string;
  readonly gender: Gender;
}

export const NAME_PRESETS: ReadonlyArray<NamePreset> = [
  { name: 'Minh', gender: 'male' },
  { name: 'Nam', gender: 'male' },
  { name: 'Bảo', gender: 'male' },
  { name: 'Khải', gender: 'male' },
  { name: 'An', gender: 'male' },
  { name: 'Khoa', gender: 'male' },
  { name: 'Linh', gender: 'female' },
  { name: 'Hương', gender: 'female' },
  { name: 'Trang', gender: 'female' },
  { name: 'Mai', gender: 'female' },
  { name: 'Vy', gender: 'female' },
  { name: 'Châu', gender: 'female' },
];

export function randomPreset(rng: () => number = Math.random): NamePreset {
  const idx = Math.floor(rng() * NAME_PRESETS.length);
  const safe = Math.min(idx, NAME_PRESETS.length - 1);
  return NAME_PRESETS[safe]!;
}
