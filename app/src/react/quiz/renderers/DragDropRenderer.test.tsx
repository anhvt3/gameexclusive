import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DragDropRenderer } from './DragDropRenderer';
import type { DragDropLO } from '@data/supham/LearningObjectSchema';

const sampleLO: DragDropLO = {
  id: 1,
  learning_object_code: 'TEST_DD',
  learning_object_name: 'Test DD',
  grade_name: 'G6',
  subject_name: 'KEN',
  learning_object_difficulty: { learning_object_difficulty_name: '2' },
  quiz_type_id: 8,
  question_text: 'Phân loại:',
  drop_zones: [
    { id: 'nouns', label: 'Noun', capacity: 2, correct_items: ['apple', 'book'] },
    { id: 'verbs', label: 'Verb', capacity: 2, correct_items: ['run', 'jump'] },
  ],
  draggable_items: [
    { id: 'run', text: 'run' },
    { id: 'apple', text: 'apple' },
    { id: 'jump', text: 'jump' },
    { id: 'book', text: 'book' },
  ],
};

describe('DragDropRenderer — pool-based click-assign fallback', () => {
  it('renders all zones and all pool items', () => {
    render(<DragDropRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    expect(screen.getByText('Noun')).toBeInTheDocument();
    expect(screen.getByText('Verb')).toBeInTheDocument();
    expect(screen.getByText('run')).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('jump')).toBeInTheDocument();
    expect(screen.getByText('book')).toBeInTheDocument();
  });

  it('click item then click zone → item assigned to zone', async () => {
    const user = userEvent.setup();
    render(<DragDropRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    await user.click(screen.getByTestId('pool-item-apple'));
    await user.click(screen.getByTestId('zone-nouns'));
    expect(screen.getByTestId('zone-nouns')).toHaveTextContent('apple');
  });

  it('submit disabled until all items assigned', async () => {
    const user = userEvent.setup();
    render(<DragDropRenderer lo={sampleLO} onSubmit={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /xác nhận|submit/i });
    expect(btn).toBeDisabled();
    // assign 3 items, 1 remaining
    await user.click(screen.getByTestId('pool-item-apple'));
    await user.click(screen.getByTestId('zone-nouns'));
    await user.click(screen.getByTestId('pool-item-book'));
    await user.click(screen.getByTestId('zone-nouns'));
    await user.click(screen.getByTestId('pool-item-run'));
    await user.click(screen.getByTestId('zone-verbs'));
    expect(btn).toBeDisabled();
    await user.click(screen.getByTestId('pool-item-jump'));
    await user.click(screen.getByTestId('zone-verbs'));
    expect(btn).toBeEnabled();
  });

  it('all correct placements → isCorrect=true', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DragDropRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const pairs: Array<[string, string]> = [
      ['apple', 'nouns'],
      ['book', 'nouns'],
      ['run', 'verbs'],
      ['jump', 'verbs'],
    ];
    for (const [item, zone] of pairs) {
      await user.click(screen.getByTestId(`pool-item-${item}`));
      await user.click(screen.getByTestId(`zone-${zone}`));
    }
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true }));
  });

  it('mix wrong placements → isCorrect=false with perZone flags', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DragDropRenderer lo={sampleLO} onSubmit={onSubmit} />);
    const pairs: Array<[string, string]> = [
      ['apple', 'verbs'], // wrong
      ['book', 'nouns'],
      ['run', 'nouns'], // wrong
      ['jump', 'verbs'],
    ];
    for (const [item, zone] of pairs) {
      await user.click(screen.getByTestId(`pool-item-${item}`));
      await user.click(screen.getByTestId(`zone-${zone}`));
    }
    await user.click(screen.getByRole('button', { name: /xác nhận|submit/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: false }));
  });
});
