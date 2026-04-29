import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ELEMENTS,
  getMultiplier,
  getWeaknessElement,
  calculateDamage,
  type Element,
} from './ElementSystem';

describe('ElementSystem — unit tests (AP CL1)', () => {
  it('Fire beats Plant (×2.0)', () => {
    expect(getMultiplier('Fire', 'Plant')).toBe(2.0);
  });

  it('Water beats Fire (×2.0)', () => {
    expect(getMultiplier('Water', 'Fire')).toBe(2.0);
  });

  it('Plant beats Water (×2.0)', () => {
    expect(getMultiplier('Plant', 'Water')).toBe(2.0);
  });

  it('Ice beats Plant (×2.0)', () => {
    expect(getMultiplier('Ice', 'Plant')).toBe(2.0);
  });

  it('Fire resisted by Water (×0.5)', () => {
    expect(getMultiplier('Fire', 'Water')).toBe(0.5);
  });

  it('same element neutral (×1.0)', () => {
    expect(getMultiplier('Fire', 'Fire')).toBe(1.0);
    expect(getMultiplier('Astral', 'Astral')).toBe(1.0);
  });

  it('Shadow vs Astral (×2.0)', () => {
    expect(getMultiplier('Shadow', 'Astral')).toBe(2.0);
  });

  it('calculateDamage: power × multiplier × difficulty scale, no crit', () => {
    // 100 × 2.0 × (1 + 3/10) = 260
    expect(calculateDamage(100, 'Fire', 'Plant', 3, false)).toBe(260);
  });

  it('calculateDamage: crit adds ×1.5', () => {
    // 100 × 2.0 × 1.3 × 1.5 = 390
    expect(calculateDamage(100, 'Fire', 'Plant', 3, true)).toBe(390);
  });

  it('calculateDamage: neutral element difficulty 1', () => {
    // 50 × 1.0 × (1 + 1/10) = 55
    expect(calculateDamage(50, 'Fire', 'Fire', 1, false)).toBe(55);
  });
});

describe('ElementSystem — property-based tests (v1.1 CEO #8)', () => {
  const elementArb = fc.constantFrom(...ELEMENTS);

  it('damage is never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        elementArb,
        elementArb,
        fc.integer({ min: 1, max: 5 }),
        fc.boolean(),
        (power, atk, def, diff, crit) => {
          expect(calculateDamage(power, atk, def, diff, crit)).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('multiplier always in valid set {0.5, 1, 1.5, 2}', () => {
    fc.assert(
      fc.property(elementArb, elementArb, (atk, def) => {
        const m = getMultiplier(atk, def);
        expect([0.5, 1, 1.5, 2]).toContain(m);
      })
    );
  });

  it('calculateDamage deterministic (same input → same output)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        elementArb,
        elementArb,
        fc.integer({ min: 1, max: 5 }),
        fc.boolean(),
        (power, atk, def, diff, crit) => {
          const a = calculateDamage(power, atk, def, diff, crit);
          const b = calculateDamage(power, atk, def, diff, crit);
          expect(a).toBe(b);
        }
      )
    );
  });

  it('all 64 element pairs covered (no undefined)', () => {
    for (const atk of ELEMENTS) {
      for (const def of ELEMENTS) {
        const m = getMultiplier(atk, def);
        expect(typeof m).toBe('number');
        expect(Number.isFinite(m)).toBe(true);
      }
    }
  });
});

describe('ElementSystem — error cases', () => {
  it('throws on invalid attacker element', () => {
    expect(() => getMultiplier('NotAnElement' as Element, 'Fire')).toThrow();
  });

  it('throws on invalid defender element', () => {
    expect(() => getMultiplier('Fire', 'Invalid' as Element)).toThrow();
  });
});

describe('ElementSystem — getWeaknessElement (Step 22.16)', () => {
  it('Fire monster → Water (the highest-multiplier attacker)', () => {
    expect(getWeaknessElement('Fire')).toBe('Water');
  });

  it('Plant monster → Fire (Fire×Plant=2.0)', () => {
    expect(getWeaknessElement('Plant')).toBe('Fire');
  });

  it('Water monster → Storm (tie 2.0 with Plant; Storm wins by ELEMENTS order)', () => {
    // Storm and Plant both hit Water for 2.0; Storm appears earlier in ELEMENTS,
    // so the deterministic tie-break selects it.
    expect(getWeaknessElement('Water')).toBe('Storm');
  });

  it('Storm monster → Earth (Earth×Storm=2.0)', () => {
    expect(getWeaknessElement('Storm')).toBe('Earth');
  });

  it('weakness is never the same as the defender (no self-mirror)', () => {
    for (const e of ELEMENTS) {
      expect(getWeaknessElement(e)).not.toBe(e);
    }
  });

  it('throws on invalid defender', () => {
    expect(() => getWeaknessElement('Bogus' as Element)).toThrow();
  });
});
