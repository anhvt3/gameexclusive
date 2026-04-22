import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozeRenderer } from './ClozeRenderer';
import type { ClozeLO } from '@data/supham/LearningObjectSchema';

const sampleLO: ClozeLO = {
  id: 1,
  learning_object_code: 'TEST_CLOZE',
  learning_object_name: 'Test Cloze',
  grade_name: 'G4',
  subject_name: 'KEN',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 1,
  question_text: 'She ___(1)___ to school and ___(2)___ homework.',
  blanks: [
    { id: 1, correct_answer: 'goes', alternatives: ['goes'] },
    { id: 2, correct_answer: 'does', alternatives: ['does'] },
  ],
  case_sensitive: false,
};

describe('ClozeRenderer', () => {
  it('renders question and N inputs for N blanks', () => {
    render(<ClozeRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('submit button disabled until all blanks filled', async () => {
    const user = userEvent.setup();
    render(<ClozeRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /xác nhận|submit/i });
    expect(btn).toBeDisabled();
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, 'goes');
    expect(btn).toBeDisabled();
    await user.type(inputs[1]!, 'does');
    expect(btn).toBeEnabled();
  });

  it('all correct → onSubmit isCorrect=true', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ClozeRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, 'goes');
    await user.type(inputs[1]!, 'does');
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, perBlank: [true, true] })
    );
  });

  it('one wrong → onSubmit isCorrect=false with per-blank flags', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ClozeRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, 'went');
    await user.type(inputs[1]!, 'does');
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: false, perBlank: [false, true] })
    );
  });

  it('case-insensitive: Goes accepted when case_sensitive=false', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ClozeRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, 'Goes');
    await user.type(inputs[1]!, 'DOES');
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true }));
  });

  it('case-sensitive: "Goes" rejected when case_sensitive=true', async () => {
    const strictLO: ClozeLO = { ...sampleLO, case_sensitive: true };
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ClozeRenderer lo={strictLO} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, 'Goes');
    await user.type(inputs[1]!, 'does');
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: false }));
  });

  it('whitespace trimmed from user input', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ClozeRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0]!, '  goes  ');
    await user.type(inputs[1]!, 'does');
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true }));
  });
});
