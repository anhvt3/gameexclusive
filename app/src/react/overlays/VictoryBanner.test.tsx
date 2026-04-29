import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { eventBus } from '@bus/EventBus';
import { VictoryBanner, VICTORY_BANNER_REVEAL_MS } from './VictoryBanner';

beforeEach(() => {
  eventBus.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('VictoryBanner — Step 22.16', () => {
  it('renders nothing while idle', () => {
    const { container } = render(<VictoryBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('EXIT_COMBAT won=true → banner becomes visible with role="alert"', () => {
    render(<VictoryBanner />);
    act(() => {
      eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    });
    expect(screen.getByTestId('victory-banner')).toBeInTheDocument();
    expect(screen.getByRole('alert', { name: /Chiến thắng/ })).toBeInTheDocument();
  });

  it('EXIT_COMBAT won=false → banner stays hidden', () => {
    render(<VictoryBanner />);
    act(() => {
      eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    });
    expect(screen.queryByTestId('victory-banner')).not.toBeInTheDocument();
  });

  it('auto-dismisses after VICTORY_BANNER_REVEAL_MS', () => {
    render(<VictoryBanner />);
    act(() => {
      eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    });
    expect(screen.getByTestId('victory-banner')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(VICTORY_BANNER_REVEAL_MS + 1);
    });
    expect(screen.queryByTestId('victory-banner')).not.toBeInTheDocument();
  });

  it('subsequent EXIT_COMBAT won=true after dismiss re-shows the banner', () => {
    render(<VictoryBanner />);
    act(() => {
      eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(VICTORY_BANNER_REVEAL_MS + 1);
    });
    expect(screen.queryByTestId('victory-banner')).not.toBeInTheDocument();
    act(() => {
      eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 99, monster_id: 4 });
    });
    expect(screen.getByTestId('victory-banner')).toBeInTheDocument();
  });
});
