import { describe, expect, it } from 'vitest';
import { getMultiplier, getStrongestCounter } from './ElementMatrix';
import type { Element } from '@/types/element';

describe('ElementMatrix — Sprint A', () => {
  it('Fire is strong vs Plant (×2.0)', () => {
    expect(getMultiplier('Fire', 'Plant')).toBe(2.0);
  });

  it('Fire is weak vs Water (×0.5)', () => {
    expect(getMultiplier('Fire', 'Water')).toBe(0.5);
  });

  it('same-element matchup is neutral (×1.0)', () => {
    expect(getMultiplier('Fire', 'Fire')).toBe(1.0);
  });

  it('unknown pair defaults to neutral', () => {
    expect(getMultiplier('Astral', 'Plant')).toBe(1.0);
  });

  it('every cell returns 0.5, 1.0, or 2.0', () => {
    const elements: Element[] = [
      'Fire',
      'Water',
      'Plant',
      'Ice',
      'Storm',
      'Earth',
      'Astral',
      'Shadow',
    ];
    for (const a of elements) {
      for (const d of elements) {
        const m = getMultiplier(a, d);
        expect([0.5, 1.0, 2.0]).toContain(m);
      }
    }
  });

  it('Earth has 3 strong matchups (Fire, Storm, Shadow)', () => {
    expect(getMultiplier('Earth', 'Fire')).toBe(2.0);
    expect(getMultiplier('Earth', 'Storm')).toBe(2.0);
    expect(getMultiplier('Earth', 'Shadow')).toBe(2.0);
  });

  it('getStrongestCounter(Storm) returns Earth', () => {
    expect(getStrongestCounter('Storm')).toBe('Earth');
  });

  it('getStrongestCounter(Plant) returns Fire or Ice (both ×2)', () => {
    const c = getStrongestCounter('Plant');
    expect(['Fire', 'Ice']).toContain(c);
  });
});
