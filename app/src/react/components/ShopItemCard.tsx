import type { ShopItemSlot } from '@/types/shop';
import { ITEM_REGISTRY } from '@/data/staticConfig/items';

interface Props {
  slot: ShopItemSlot;
  battleStars: number;
  onBuy: (itemId: string) => void;
}

const RARITY_EMOJI: Record<string, string> = {
  common: '🍎',
  rare: '🌟',
  epic: '🐉',
};

export function ShopItemCard({ slot, battleStars, onBuy }: Props) {
  const item = ITEM_REGISTRY.find((i) => i.id === slot.itemId);
  const outOfStock = slot.stockRemaining <= 0;
  const insufficient = battleStars < slot.priceBattleStars;
  const disabled = outOfStock || insufficient;
  const label = outOfStock ? 'Hết' : 'Mua';
  const priceClass = insufficient ? 'text-red-500' : 'text-amber-700';
  const emoji = item ? (RARITY_EMOJI[item.rarity] ?? '🎁') : '🎁';
  const name = item?.displayNameVi ?? slot.itemId;

  return (
    <div
      data-testid="shop-item-card"
      className="flex flex-col items-center gap-2 rounded-lg bg-stone-100 p-3 ring-1 ring-stone-300"
    >
      <span aria-hidden="true" className="text-4xl">
        {emoji}
      </span>
      <span className="text-sm font-semibold text-stone-700">{name}</span>
      <span className={`text-sm font-bold ${priceClass}`}>⭐ {slot.priceBattleStars}</span>
      <button
        data-testid="shop-buy-btn"
        onClick={() => onBuy(slot.itemId)}
        disabled={disabled}
        className="rounded bg-amber-600 px-3 py-1 text-sm font-bold text-white disabled:bg-stone-300"
      >
        {label}
      </button>
    </div>
  );
}
