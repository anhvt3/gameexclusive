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
