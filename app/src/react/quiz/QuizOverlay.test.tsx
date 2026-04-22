import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizOverlay } from './QuizOverlay';
import { eventBus } from '@bus/EventBus';

beforeEach(() => {
  eventBus.clear();
});

afterEach(() => {
  eventBus.clear();
});

describe('QuizOverlay — event-driven container', () => {
  it('mounts hidden by default', () => {
    render(<QuizOverlay />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('OPEN_QUIZ with known lo_id → overlay visible + correct renderer', async () => {
    render(<QuizOverlay />);
    // lo_id 100001 is in mocks (multiple_choice_math_g5.json)
    eventBus.emit('OPEN_QUIZ', { lo_id: 100001, monster_id: null });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText(/1\/2 \+ 1\/4/)).toBeInTheDocument();
  });

  it('OPEN_QUIZ with unknown lo_id → overlay stays hidden + console warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<QuizOverlay />);
    eventBus.emit('OPEN_QUIZ', { lo_id: 9999999, monster_id: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('9999999'));
    warnSpy.mockRestore();
  });

  it('submit correct → QUIZ_RESULT emitted + overlay closes', async () => {
    const resultHandler = vi.fn();
    const off = eventBus.on('QUIZ_RESULT', resultHandler);
    const user = userEvent.setup();
    render(<QuizOverlay />);

    eventBus.emit('OPEN_QUIZ', { lo_id: 100001, monster_id: 42 });
    await waitFor(() => screen.getByRole('dialog'));
    // Click correct answer ('b' = "3/4")
    await user.click(screen.getByText('3/4'));

    await waitFor(() => {
      expect(resultHandler).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true, lo_id: 100001 })
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    off();
  });

  it('submit wrong → QUIZ_RESULT emitted with correct=false', async () => {
    const resultHandler = vi.fn();
    const off = eventBus.on('QUIZ_RESULT', resultHandler);
    const user = userEvent.setup();
    render(<QuizOverlay />);

    eventBus.emit('OPEN_QUIZ', { lo_id: 100001, monster_id: null });
    await waitFor(() => screen.getByRole('dialog'));
    await user.click(screen.getByText('1/6')); // wrong

    await waitFor(() => {
      expect(resultHandler).toHaveBeenCalledWith(
        expect.objectContaining({ correct: false, lo_id: 100001 })
      );
    });
    off();
  });

  it('unmount removes listener (no leak)', () => {
    const { unmount } = render(<QuizOverlay />);
    unmount();
    // Emit after unmount — no throw, no state leak
    expect(() => eventBus.emit('OPEN_QUIZ', { lo_id: 100001, monster_id: null })).not.toThrow();
  });
});
