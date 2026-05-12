import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShopOverlay } from './ShopOverlay';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('ShopOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    useSaveState.getState().addBattleStars(1000);
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
  });

  it('does not render when open=false', () => {
    render(<ShopOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('shop-overlay')).not.toBeInTheDocument();
  });

  it('renders 5 item cards when open', () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    const cards = screen.getAllByTestId('shop-item-card');
    expect(cards.length).toBe(5);
  });

  it('shows current battle stars balance', () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('shop-balance')).toHaveTextContent('1000');
  });

  it('clicking buy triggers purchase and inventory grows', async () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    const before = useSaveState.getState().inventory.length;
    const firstBuy = screen.getAllByTestId('shop-buy-btn')[0]!;
    fireEvent.click(firstBuy);
    await waitFor(() => {
      expect(useSaveState.getState().inventory.length).toBe(before + 1);
    });
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<ShopOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('shop-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });
});
