import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultipleChoiceRenderer } from './MultipleChoiceRenderer';
import type { MultipleChoiceLO } from '@data/supham/LearningObjectSchema';

const sampleLO: MultipleChoiceLO = {
  id: 1,
  learning_object_code: 'TEST_MC',
  learning_object_name: 'Test MC',
  grade_name: 'G5',
  subject_name: 'Math',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 3,
  question_text: 'What is 1 + 1?',
  options: [
    { id: 'a', text: '1' },
    { id: 'b', text: '2' },
    { id: 'c', text: '3' },
    { id: 'd', text: '4' },
  ],
  correct_option_id: 'b',
};

describe('MultipleChoiceRenderer', () => {
  it('renders question and all 4 options', () => {
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    expect(screen.getByText('What is 1 + 1?')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('click correct option fires onSubmit with isCorrect=true', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={onSubmit} />);
    await user.click(screen.getByText('2'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ optionId: 'b', isCorrect: true })
    );
  });

  it('click wrong option fires onSubmit with isCorrect=false', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={onSubmit} />);
    await user.click(screen.getByText('1'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ optionId: 'a', isCorrect: false })
    );
  });

  it('keyboard navigation: Tab + Enter selects option', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={onSubmit} />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ optionId: 'a' }));
  });

  it('all options have role=button for a11y', () => {
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('timeSpent is non-negative number', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={onSubmit} />);
    await user.click(screen.getByText('2'));
    const call = onSubmit.mock.calls[0]?.[0] as { timeSpent: number };
    expect(typeof call.timeSpent).toBe('number');
    expect(call.timeSpent).toBeGreaterThanOrEqual(0);
  });

  it('clicking same option twice only fires onSubmit once (submit locks after first click)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceRenderer lo={sampleLO} onSubmit={onSubmit} />);
    await user.click(screen.getByText('2'));
    await user.click(screen.getByText('2'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
