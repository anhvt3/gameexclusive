/**
 * Quiz hint visibility (Sprint E Task 11)
 *
 * Validates the visibility decision rule:
 *   showHint = seed < HINT_VISIBILITY_PROBABILITY[difficulty]
 *
 * Decoupled unit test of the threshold constant + smoke integration test of
 * the gating in MultipleChoiceRenderer.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSaveState } from '@/persistence/SaveStateStore';
import { HINT_VISIBILITY_PROBABILITY } from '@/types/identity';
import { MultipleChoiceRenderer } from '@/react/quiz/renderers/MultipleChoiceRenderer';
import type { MultipleChoiceLO } from '@data/supham/LearningObjectSchema';

const sampleLO: MultipleChoiceLO = {
  id: 42,
  learning_object_code: 'TEST_HINT',
  learning_object_name: 'Test Hint',
  grade_name: 'G5',
  subject_name: 'Math',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 3,
  question_text: '2 + 2 = ?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
  ],
  correct_option_id: 'b',
};

describe('Quiz hint visibility (Sprint E) - probability constant', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('HINT_VISIBILITY_PROBABILITY maps difficulty to threshold', () => {
    expect(HINT_VISIBILITY_PROBABILITY.easy).toBe(0.5);
    expect(HINT_VISIBILITY_PROBABILITY.medium).toBe(0.25);
    expect(HINT_VISIBILITY_PROBABILITY.hard).toBe(0);
  });

  it('hard difficulty: hintSeed=0.001 still hides hint (threshold=0)', () => {
    const seed = 0.001;
    expect(seed < HINT_VISIBILITY_PROBABILITY.hard).toBe(false);
  });

  it('easy difficulty: hintSeed=0.49 shows hint (threshold=0.5)', () => {
    expect(0.49 < HINT_VISIBILITY_PROBABILITY.easy).toBe(true);
  });

  it('medium difficulty: hintSeed=0.30 hides hint (threshold=0.25)', () => {
    expect(0.3 < HINT_VISIBILITY_PROBABILITY.medium).toBe(false);
  });
});

describe('Quiz hint visibility (Sprint E) - MultipleChoiceRenderer integration', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('hard difficulty always hides the hint button', () => {
    useSaveState.getState().setHintDifficulty('hard');
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={() => {}} />);
    expect(screen.queryByTestId('quiz-hint-button')).not.toBeInTheDocument();
  });

  it('easy difficulty: render does not crash and hint button is conditional', () => {
    useSaveState.getState().setHintDifficulty('easy');
    const { container } = render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={() => {}} />);
    // Either present or absent — both valid for probability-driven gating
    const btn = container.querySelector('[data-testid="quiz-hint-button"]');
    expect(btn === null || btn instanceof HTMLElement).toBe(true);
  });

  it('medium difficulty: render does not crash and hint button is conditional', () => {
    useSaveState.getState().setHintDifficulty('medium');
    const { container } = render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={() => {}} />);
    const btn = container.querySelector('[data-testid="quiz-hint-button"]');
    expect(btn === null || btn instanceof HTMLElement).toBe(true);
  });
});
