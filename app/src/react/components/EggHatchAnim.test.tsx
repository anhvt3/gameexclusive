import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EggHatchAnim } from './EggHatchAnim';

describe('EggHatchAnim', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders idle phase initially', () => {
    render(<EggHatchAnim onHatched={() => {}} />);
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'idle');
  });

  it('transitions idle → shake → hatch + calls onHatched', () => {
    const onHatched = vi.fn();
    render(<EggHatchAnim onHatched={onHatched} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'shake');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'hatch');
    expect(onHatched).toHaveBeenCalled();
  });

  it('cleans up timers on unmount', () => {
    const onHatched = vi.fn();
    const { unmount } = render(<EggHatchAnim onHatched={onHatched} />);
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onHatched).not.toHaveBeenCalled();
  });
});

describe('EggHatchAnim — mode prop (Phase 4)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mode="incubating" renders static egg, no timer advance', () => {
    const onHatched = vi.fn();
    render(<EggHatchAnim onHatched={onHatched} mode="incubating" />);
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'idle');
    act(() => vi.advanceTimersByTime(5000));
    expect(onHatched).not.toHaveBeenCalled();
  });

  it('mode="hatching" runs idle→shake→hatch sequence (Phase 3 behavior)', () => {
    const onHatched = vi.fn();
    render(<EggHatchAnim onHatched={onHatched} mode="hatching" />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'shake');
    act(() => vi.advanceTimersByTime(1000));
    expect(onHatched).toHaveBeenCalled();
  });

  it('no mode prop defaults to "hatching" (backward-compat with Phase 3 callers)', () => {
    const onHatched = vi.fn();
    render(<EggHatchAnim onHatched={onHatched} />);
    act(() => vi.advanceTimersByTime(1500));
    expect(onHatched).toHaveBeenCalled();
  });
});
