import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopItemCard } from './ShopItemCard';

const slot = {
  itemId: 'hat-apprentice-01',
  priceBattleStars: 30,
  stockRemaining: 1,
  cycleLimit: 1,
};

describe('ShopItemCard', () => {
  it('renders price', () => {
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-item-card')).toHaveTextContent('30');
  });

  it('buy button enabled when in stock + sufficient stars', () => {
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-buy-btn')).not.toBeDisabled();
  });

  it('buy button disabled "Hết" when stock=0', () => {
    render(
      <ShopItemCard slot={{ ...slot, stockRemaining: 0 }} battleStars={100} onBuy={() => {}} />
    );
    const btn = screen.getByTestId('shop-buy-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Hết');
  });

  it('buy button disabled when insufficient stars', () => {
    render(<ShopItemCard slot={slot} battleStars={10} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-buy-btn')).toBeDisabled();
  });

  it('clicking buy calls onBuy with itemId', () => {
    const onBuy = vi.fn();
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={onBuy} />);
    fireEvent.click(screen.getByTestId('shop-buy-btn'));
    expect(onBuy).toHaveBeenCalledWith('hat-apprentice-01');
  });
});
