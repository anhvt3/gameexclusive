import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyLoginCalendarOverlay } from './DailyLoginCalendarOverlay';
import { useSaveState } from '@/persistence/SaveStateStore';
import { dailyAnchor } from '@/domain/QuestCycle';

describe('DailyLoginCalendarOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('does not render when open=false', () => {
    render(<DailyLoginCalendarOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('daily-login-overlay')).not.toBeInTheDocument();
  });

  it('renders 7 day-cells when open=true', () => {
    render(<DailyLoginCalendarOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('daily-login-overlay')).toBeInTheDocument();
    for (let day = 1; day <= 7; day++) {
      expect(screen.getByTestId(`day-cell-${day}`)).toBeInTheDocument();
    }
  });

  it('shows streak count from state', () => {
    useSaveState.setState({ loginStreak: 5 });
    render(<DailyLoginCalendarOverlay open={true} onClose={() => {}} />);
    // Look for text containing streak number — either "Streak 5" or just "5"
    expect(screen.getByTestId('streak-display').textContent).toContain('5');
  });

  it('claim button enabled when isLoginClaimable=true', () => {
    // Default state: lastLoginAnchorUtc7 = 0 → claimable
    render(<DailyLoginCalendarOverlay open={true} onClose={() => {}} />);
    const claimBtn = screen.getByTestId('claim-login-btn');
    expect(claimBtn).not.toBeDisabled();
  });

  it('claim button disabled when already claimed today', () => {
    useSaveState.getState().commitLoginClaim(dailyAnchor(Date.now()), 3);
    render(<DailyLoginCalendarOverlay open={true} onClose={() => {}} />);
    const claimBtn = screen.getByTestId('claim-login-btn');
    expect(claimBtn).toBeDisabled();
  });

  it('clicking claim mutates state and triggers onClose after delay', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<DailyLoginCalendarOverlay open={true} onClose={onClose} />);

    const claimBtn = screen.getByTestId('claim-login-btn');
    fireEvent.click(claimBtn);

    // State updated immediately
    expect(useSaveState.getState().loginStreak).toBe(1);
    expect(useSaveState.getState().lastLoginAnchorUtc7).not.toBe(0);

    // onClose called after 1500ms
    vi.advanceTimersByTime(1500);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
