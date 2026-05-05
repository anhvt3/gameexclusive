import { describe, expect, it } from 'vitest';
import { QUESTS, findQuestDef, questsByTier } from './quests';

describe('QUESTS catalog', () => {
  it('declares exactly 8 quests', () => {
    expect(QUESTS).toHaveLength(8);
  });

  it('partitions into 3 daily + 2 weekly + 3 main', () => {
    expect(QUESTS.filter((q) => q.tier === 'daily')).toHaveLength(3);
    expect(QUESTS.filter((q) => q.tier === 'weekly')).toHaveLength(2);
    expect(QUESTS.filter((q) => q.tier === 'main')).toHaveLength(3);
  });

  it('uses unique quest IDs', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every quest has target > 0', () => {
    for (const q of QUESTS) {
      expect(q.target, `${q.id} target`).toBeGreaterThan(0);
    }
  });

  it('rewardTier matches tier convention (daily=common, weekly=rare, main=epic)', () => {
    for (const q of QUESTS) {
      const expected = q.tier === 'daily' ? 'common' : q.tier === 'weekly' ? 'rare' : 'epic';
      expect(q.rewardTier, `${q.id}`).toBe(expected);
    }
  });

  it('all source events exist in the catalog (sanity)', () => {
    const validSources = [
      'EXIT_COMBAT',
      'QUIZ_RESULT',
      'ENTER_ZONE',
      'PET_COLLECTED',
      'LEVEL_UP',
      'BOSS_DEFEATED',
    ];
    for (const q of QUESTS) {
      expect(validSources, `${q.id} source ${q.source}`).toContain(q.source);
    }
  });

  it('match returns 1 for daily-combat-3 on won=true, 0 on won=false', () => {
    const q = findQuestDef('daily-combat-3')!;
    expect(q.match({ won: true } as never)).toBe(1);
    expect(q.match({ won: false } as never)).toBe(0);
  });

  it('match returns 1 for daily-quiz-5 on correct=true, 0 on correct=false', () => {
    const q = findQuestDef('daily-quiz-5')!;
    expect(q.match({ correct: true } as never)).toBe(1);
    expect(q.match({ correct: false } as never)).toBe(0);
  });

  it('match returns 1 for daily-explore-1 on any ENTER_ZONE payload', () => {
    const q = findQuestDef('daily-explore-1')!;
    expect(q.match({ zoneId: 'forest-island' } as never)).toBe(1);
  });

  it('match returns 1 for main-level-5 only when newLevel >= 5', () => {
    const q = findQuestDef('main-level-5')!;
    expect(q.match({ newLevel: 4 } as never)).toBe(0);
    expect(q.match({ newLevel: 5 } as never)).toBe(1);
    expect(q.match({ newLevel: 99 } as never)).toBe(1);
  });

  it('match returns 1 for main-boss-forest only on bossId=forest-boss', () => {
    const q = findQuestDef('main-boss-forest')!;
    expect(q.match({ bossId: 'forest-boss' } as never)).toBe(1);
    expect(q.match({ bossId: 'volcanic-boss' } as never)).toBe(0);
  });

  it('findQuestDef returns null for unknown id', () => {
    expect(findQuestDef('nope')).toBeNull();
  });

  it('questsByTier filters correctly', () => {
    expect(questsByTier('daily')).toHaveLength(3);
    expect(questsByTier('weekly')).toHaveLength(2);
    expect(questsByTier('main')).toHaveLength(3);
  });
});
