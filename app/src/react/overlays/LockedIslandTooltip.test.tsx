import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { eventBus } from '@bus/EventBus';
import { LockedIslandTooltip, LOCKED_ISLAND_TOOLTIP_MS } from './LockedIslandTooltip';

beforeEach(() => {
  eventBus.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LockedIslandTooltip — Sprint B Task 8', () => {
  it('renders nothing initially', () => {
    render(<LockedIslandTooltip />);
    expect(screen.queryByTestId('locked-island-tooltip')).toBeNull();
  });

  it('shows tooltip with island display name + "Sắp ra mắt" when LOCKED_ISLAND_HINT fires', () => {
    render(<LockedIslandTooltip />);
    act(() => {
      eventBus.emit('LOCKED_ISLAND_HINT', { islandId: 'shadow' });
    });
    const el = screen.getByTestId('locked-island-tooltip');
    expect(el).toHaveTextContent(/Sắp ra mắt/);
    expect(el).toHaveTextContent(/Đảo Bóng Tối/);
  });

  it('hides itself after timeout', () => {
    vi.useFakeTimers();
    render(<LockedIslandTooltip />);
    act(() => {
      eventBus.emit('LOCKED_ISLAND_HINT', { islandId: 'storm' });
    });
    expect(screen.queryByTestId('locked-island-tooltip')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(LOCKED_ISLAND_TOOLTIP_MS + 1);
    });
    expect(screen.queryByTestId('locked-island-tooltip')).toBeNull();
  });

  it('ignores unknown islandId (renders nothing)', () => {
    render(<LockedIslandTooltip />);
    act(() => {
      eventBus.emit('LOCKED_ISLAND_HINT', { islandId: 'not-a-real-island' });
    });
    expect(screen.queryByTestId('locked-island-tooltip')).toBeNull();
  });
});
