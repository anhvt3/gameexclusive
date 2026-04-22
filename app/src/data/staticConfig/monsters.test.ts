import { describe, it, expect } from 'vitest';
import {
  STARTER_MONSTERS,
  BOSS_MONSTERS,
  ALL_MONSTERS,
  DAILY_BOSS_MONSTER_ID,
  findMonsterById,
} from './monsters';

describe('Monster registry (Phase 1 starters)', () => {
  it('exports 5 starter monsters', () => {
    expect(STARTER_MONSTERS).toHaveLength(5);
  });

  it('covers 5 distinct elements (Fire/Water/Plant/Ice/Storm)', () => {
    const elements = STARTER_MONSTERS.map((m) => m.element);
    expect(new Set(elements).size).toBe(5);
    expect(elements).toEqual(expect.arrayContaining(['Fire', 'Water', 'Plant', 'Ice', 'Storm']));
  });

  it('all starters have tier="starter"', () => {
    for (const m of STARTER_MONSTERS) expect(m.tier).toBe('starter');
  });

  it('all starters have baseHp in 38-50 range (AP Appendix A spec)', () => {
    for (const m of STARTER_MONSTERS) {
      expect(m.baseHp).toBeGreaterThanOrEqual(38);
      expect(m.baseHp).toBeLessThanOrEqual(50);
    }
  });

  it('all starters have unique id', () => {
    const ids = STARTER_MONSTERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('findMonsterById returns correct monster', () => {
    const e = findMonsterById(1);
    expect(e?.codename).toBe('embershed');
  });

  it('findMonsterById unknown → undefined', () => {
    expect(findMonsterById(999)).toBeUndefined();
  });

  it('sprite paths all end with _idle_128.png', () => {
    for (const m of STARTER_MONSTERS) {
      expect(m.spritePath).toMatch(/_idle_128\.png$/);
    }
  });
});

describe('Monster registry — Step 22.6 boss tier', () => {
  it('BOSS_MONSTERS has Aldergasp at id=99 with is_boss flag', () => {
    expect(BOSS_MONSTERS).toHaveLength(1);
    expect(BOSS_MONSTERS[0]!.id).toBe(DAILY_BOSS_MONSTER_ID);
    expect(BOSS_MONSTERS[0]!.codename).toBe('aldergasp');
    expect(BOSS_MONSTERS[0]!.is_boss).toBe(true);
    expect(BOSS_MONSTERS[0]!.tier).toBe('boss');
  });

  it('findMonsterById resolves boss id through ALL_MONSTERS union', () => {
    expect(findMonsterById(DAILY_BOSS_MONSTER_ID)?.is_boss).toBe(true);
    expect(ALL_MONSTERS).toHaveLength(STARTER_MONSTERS.length + BOSS_MONSTERS.length);
  });

  it('no monster id collisions between starters and bosses', () => {
    const ids = ALL_MONSTERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
