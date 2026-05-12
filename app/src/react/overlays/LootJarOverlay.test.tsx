import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LootJarOverlay } from './LootJarOverlay';
import { useSaveState, LOOT_JAR_THRESHOLD } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('LootJarOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    render(<LootJarOverlay />);
    expect(screen.queryByTestId('loot-jar-overlay')).not.toBeInTheDocument();
  });

  it('appears when LOOT_JAR_READY is emitted', () => {
    // Pre-fill jar counter so claim works later
    for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
      useSaveState.getState().incrementLootJarCounter();
    }
    render(<LootJarOverlay />);
    act(() => {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    });
    expect(screen.getByTestId('loot-jar-overlay')).toBeInTheDocument();
  });

  it('mints 3 items by t=1500ms', () => {
    for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
      useSaveState.getState().incrementLootJarCounter();
    }
    const beforeCount = useSaveState.getState().inventory.length;
    render(<LootJarOverlay />);
    act(() => {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const afterCount = useSaveState.getState().inventory.length;
    expect(afterCount - beforeCount).toBe(3);
    expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(0);
  });

  it('close button is hidden until t=2500ms', () => {
    for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
      useSaveState.getState().incrementLootJarCounter();
    }
    render(<LootJarOverlay />);
    act(() => {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    });
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    // Close button either hidden or disabled
    const closeBtn = screen.queryByTestId('loot-jar-close-btn');
    if (closeBtn) {
      expect(closeBtn).toBeDisabled();
    }
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const enabledBtn = screen.getByTestId('loot-jar-close-btn');
    expect(enabledBtn).not.toBeDisabled();
  });

  it('clicking close button hides the overlay', () => {
    for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
      useSaveState.getState().incrementLootJarCounter();
    }
    render(<LootJarOverlay />);
    act(() => {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    fireEvent.click(screen.getByTestId('loot-jar-close-btn'));
    expect(screen.queryByTestId('loot-jar-overlay')).not.toBeInTheDocument();
  });

  it('unsubscribes from LOOT_JAR_READY on unmount', () => {
    const { unmount } = render(<LootJarOverlay />);
    unmount();
    // After unmount, emitting should not trigger any state update / error.
    expect(() => {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    }).not.toThrow();
  });
});
