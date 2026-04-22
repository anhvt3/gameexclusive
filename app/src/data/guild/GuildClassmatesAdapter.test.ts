import { describe, it, expect } from 'vitest';
import { loadGuildClass, sortByWeeklyExp, GuildClassSchema } from './GuildClassmatesAdapter';

describe('GuildClassmatesAdapter', () => {
  it('loadGuildClass("G5") returns a validated 30-row roster', () => {
    const g5 = loadGuildClass('G5');
    expect(g5).not.toBeNull();
    expect(g5!.students).toHaveLength(30);
    expect(g5!.current_student_id).toBeGreaterThan(0);
    // Re-validates without throwing — ensures module-level parse succeeded.
    expect(() => GuildClassSchema.parse(g5)).not.toThrow();
  });

  it('loadGuildClass returns null for unknown grade', () => {
    expect(loadGuildClass('G1')).toBeNull();
    expect(loadGuildClass('G99')).toBeNull();
  });

  it('sortByWeeklyExp sorts descending by weekly_exp', () => {
    const g5 = loadGuildClass('G5')!;
    const sorted = sortByWeeklyExp(g5.students);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1]!.weekly_exp).toBeGreaterThanOrEqual(sorted[i]!.weekly_exp);
    }
  });

  it('sortByWeeklyExp breaks ties by id ascending (deterministic)', () => {
    const a = { id: 5, name: 'A', weekly_exp: 100, avatar_color: '#ffffff' };
    const b = { id: 2, name: 'B', weekly_exp: 100, avatar_color: '#ffffff' };
    const c = { id: 9, name: 'C', weekly_exp: 100, avatar_color: '#ffffff' };
    expect(sortByWeeklyExp([a, b, c]).map((s) => s.id)).toEqual([2, 5, 9]);
  });

  it('current_student_id resolves to a real roster entry', () => {
    const g5 = loadGuildClass('G5')!;
    const current = g5.students.find((s) => s.id === g5.current_student_id);
    expect(current).toBeDefined();
  });
});
