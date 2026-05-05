import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { QuestProgressToast } from './QuestProgressToast';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('QuestProgressToast', () => {
  beforeEach(() => useSaveState.getState().reset());
  afterEach(() => vi.useRealTimers());

  it('renders nothing initially', () => {
    render(<QuestProgressToast />);
    expect(screen.queryByTestId(/^quest-toast-/)).toBeNull();
  });

  it('appears on QUEST_PROGRESS with quest displayName + (M/N)', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.getByTestId('quest-toast-daily-combat-3')).toBeInTheDocument();
    expect(screen.getByText(/Thắng 3 trận/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('dismisses after 2.5s', () => {
    vi.useFakeTimers();
    useSaveState.setState({ questProgress: { 'daily-combat-3': 1 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.queryByTestId('quest-toast-daily-combat-3')).not.toBeNull();
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByTestId('quest-toast-daily-combat-3')).toBeNull();
  });

  it('renders ready variant when progress reaches target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.getByText(/Sẵn sàng nhận thưởng/i)).toBeInTheDocument();
  });

  it('multiple toasts queue (does not collapse to one)', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 1, 'daily-quiz-5': 1 },
    });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-quiz-5', delta: 1 });
    });
    expect(screen.getByTestId('quest-toast-daily-combat-3')).toBeInTheDocument();
    expect(screen.getByTestId('quest-toast-daily-quiz-5')).toBeInTheDocument();
  });

  it('ignores QUEST_PROGRESS for unknown questId', () => {
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'nonexistent', delta: 1 });
    });
    expect(screen.queryByTestId(/^quest-toast-/)).toBeNull();
  });
});
