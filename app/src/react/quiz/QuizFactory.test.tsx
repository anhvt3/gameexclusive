import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuizFactory } from './QuizFactory';
import type { LearningObject } from '@data/supham/LearningObjectSchema';

const mcLO: LearningObject = {
  id: 1,
  learning_object_code: 'T_MC',
  learning_object_name: 'MC',
  grade_name: 'G5',
  subject_name: 'Math',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 3,
  question_text: 'MC question',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correct_option_id: 'b',
};

const clozeLO: LearningObject = {
  id: 2,
  learning_object_code: 'T_CLOZE',
  learning_object_name: 'Cloze',
  grade_name: 'G4',
  subject_name: 'KEN',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 1,
  question_text: 'Fill ___(1)___',
  blanks: [{ id: 1, correct_answer: 'ans', alternatives: ['ans'] }],
};

const ddLO: LearningObject = {
  id: 3,
  learning_object_code: 'T_DD',
  learning_object_name: 'DD',
  grade_name: 'G6',
  subject_name: 'KEN',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 8,
  question_text: 'Drag',
  drop_zones: [{ id: 'z1', label: 'Z1', capacity: 1, correct_items: ['a'] }],
  draggable_items: [{ id: 'a', text: 'A' }],
};

describe('QuizFactory — polymorphic dispatch', () => {
  it('quiz_type_id=3 → MultipleChoiceRenderer (shows options)', () => {
    render(<QuizFactory lo={mcLO} onSubmit={vi.fn()} />);
    expect(screen.getByText('MC question')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('quiz_type_id=1 → ClozeRenderer (shows input)', () => {
    render(<QuizFactory lo={clozeLO} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('quiz_type_id=8 → DragDropRenderer (shows zones)', () => {
    render(<QuizFactory lo={ddLO} onSubmit={vi.fn()} />);
    expect(screen.getByText('Z1')).toBeInTheDocument();
    expect(screen.getByTestId('pool-item-a')).toBeInTheDocument();
  });

  it('unknown quiz_type renders fallback message', () => {
    // Cast bypass to simulate runtime schema drift
    const unknown = { ...mcLO, quiz_type_id: 99 } as unknown as LearningObject;
    render(<QuizFactory lo={unknown} onSubmit={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/chưa hỗ trợ/i);
    expect(screen.getByRole('alert')).toHaveTextContent('quiz_type_id=99');
  });

  it('onSubmit passes through to child renderer', async () => {
    const onSubmit = vi.fn();
    const userEvent = await import('@testing-library/user-event');
    const user = userEvent.default.setup();
    render(<QuizFactory lo={mcLO} onSubmit={onSubmit} />);
    await user.click(screen.getByText('B'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ optionId: 'b', isCorrect: true })
    );
  });
});
