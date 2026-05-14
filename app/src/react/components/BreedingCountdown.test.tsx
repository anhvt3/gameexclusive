import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BreedingCountdown } from './BreedingCountdown';

describe('BreedingCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const baseChamber = {
    hatchAt: 1_000_000,
    rushedAt: null as number | null,
    offspringSpec: { rarity: 'common' as const, codename: 'pyropup' as const, level: 1 },
    startedAt: 1_000_000 - 300_000,
    costBattleStars: 50,
    parentA: 'a',
    parentB: 'b',
  };

  beforeEach(() => {
    vi.setSystemTime(new Date(1_000_000 - 250_000));
  });

  it('renders countdown text in MM:SS format', () => {
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={1000}
        onReady={() => {}}
      />
    );
    const text = screen.getByTestId('breeding-countdown-text');
    expect(text.textContent).toMatch(/\d:\d{2}/);
  });

  it('ticks down each second', () => {
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={1000}
        onReady={() => {}}
      />
    );
    const before = screen.getByTestId('breeding-countdown-text').textContent;
    act(() => vi.advanceTimersByTime(1100));
    const after = screen.getByTestId('breeding-countdown-text').textContent;
    expect(after).not.toBe(before);
  });

  it('rush button shows cost from rarity', () => {
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={1000}
        onReady={() => {}}
      />
    );
    const btn = screen.getByTestId('breeding-rush-btn');
    expect(btn.textContent).toContain('50');
  });

  it('rush button disabled when insufficient stars', () => {
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={10}
        onReady={() => {}}
      />
    );
    expect(screen.getByTestId('breeding-rush-btn')).toBeDisabled();
  });

  it('rush button disabled when already rushed', () => {
    render(
      <BreedingCountdown
        chamber={{ ...baseChamber, rushedAt: 1 }}
        onRush={() => {}}
        battleStars={1000}
        onReady={() => {}}
      />
    );
    expect(screen.getByTestId('breeding-rush-btn')).toBeDisabled();
  });

  it('calls onRush when clicked', () => {
    const onRush = vi.fn();
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={onRush}
        battleStars={1000}
        onReady={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('breeding-rush-btn'));
    expect(onRush).toHaveBeenCalled();
  });

  it('calls onReady when now reaches hatchAt', () => {
    const onReady = vi.fn();
    render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={1000}
        onReady={onReady}
      />
    );
    act(() => {
      vi.setSystemTime(new Date(baseChamber.hatchAt));
      vi.advanceTimersByTime(1100);
    });
    expect(onReady).toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const onReady = vi.fn();
    const { unmount } = render(
      <BreedingCountdown
        chamber={baseChamber}
        onRush={() => {}}
        battleStars={1000}
        onReady={onReady}
      />
    );
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onReady).not.toHaveBeenCalled();
  });
});
