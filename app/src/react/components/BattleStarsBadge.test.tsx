import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleStarsBadge } from './BattleStarsBadge';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('BattleStarsBadge', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('renders the ⭐ glyph and current count', () => {
    render(<BattleStarsBadge />);
    const badge = screen.getByTestId('battle-stars-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('⭐');
    expect(badge.textContent).toContain('0');
  });

  it('renders even when count is zero', () => {
    render(<BattleStarsBadge />);
    expect(screen.getByTestId('battle-stars-badge')).toBeInTheDocument();
  });

  it('reflects updated count after addBattleStars', () => {
    const { rerender } = render(<BattleStarsBadge />);
    useSaveState.getState().addBattleStars(42);
    rerender(<BattleStarsBadge />);
    const badge = screen.getByTestId('battle-stars-badge');
    expect(badge.textContent).toContain('42');
  });

  it('exposes the tooltip text via title attribute', () => {
    render(<BattleStarsBadge />);
    const badge = screen.getByTestId('battle-stars-badge');
    expect(badge.getAttribute('title')).toBe('Battle Stars — Sắp ra mắt Cửa Hàng!');
  });
});
