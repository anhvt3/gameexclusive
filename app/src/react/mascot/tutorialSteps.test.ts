import { describe, expect, it } from 'vitest';
import { TUTORIAL_FLAG, TUTORIAL_STEPS } from './tutorialSteps';

describe('TUTORIAL_STEPS Sprint E extension', () => {
  it('contains 8 beats', () => {
    expect(TUTORIAL_STEPS).toHaveLength(8);
  });

  it('preserves existing beat 1 wording', () => {
    expect(TUTORIAL_STEPS[0]!.text).toMatch(/Chào bạn!/);
  });

  it('beat 5 introduces World Map 3 islands', () => {
    expect(TUTORIAL_STEPS[4]!.text).toMatch(/Forest, Volcanic, Frozen/);
  });

  it('beat 6 covers pet rescue with "bạn" addressing (POSUP-aligned)', () => {
    expect(TUTORIAL_STEPS[5]!.text).toMatch(/Cứu pet/);
    expect(TUTORIAL_STEPS[5]!.text).toMatch(/cùng bạn đánh nhau/);
    expect(TUTORIAL_STEPS[5]!.text).not.toMatch(/cùng em đánh nhau/);
  });

  it('beat 7 invites Quests panel', () => {
    expect(TUTORIAL_STEPS[6]!.text).toMatch(/bảng Quests/);
  });

  it('beat 8 mentions sparkle bell ready quest', () => {
    expect(TUTORIAL_STEPS[7]!.text).toMatch(/chuông/);
  });

  it('beats with target declare type and selector', () => {
    const withTarget = TUTORIAL_STEPS.filter((s) => s.target);
    for (const step of withTarget) {
      expect(['canvas', 'dom']).toContain(step.target!.type);
      expect(typeof step.target!.selector).toBe('string');
      expect(step.target!.selector.length).toBeGreaterThan(0);
    }
  });

  it('TUTORIAL_FLAG is "tutorial_completed"', () => {
    expect(TUTORIAL_FLAG).toBe('tutorial_completed');
  });
});
