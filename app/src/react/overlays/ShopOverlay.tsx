import { useSaveState } from '@/persistence/SaveStateStore';
import { ShopItemCard } from '@/react/components/ShopItemCard';
import { performShopPurchase } from '@/domain/performShopPurchase';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShopOverlay({ open, onClose }: Props) {
  const shopStock = useSaveState((s) => s.shopStock);
  const battleStars = useSaveState((s) => s.battleStars);

  if (!open) return null;

  const handleBuy = async (itemId: string) => {
    await performShopPurchase(itemId);
  };

  return (
    <div
      data-testid="shop-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-amber-50 p-6 shadow-2xl ring-2 ring-amber-200">
        <header className="mb-4 flex items-center justify-between gap-6">
          <h2 className="text-xl font-bold text-amber-900">🛒 Cửa Hàng</h2>
          <span data-testid="shop-balance" className="text-sm font-semibold text-amber-700">
            ⭐ {battleStars}
          </span>
          <button
            data-testid="shop-close-btn"
            onClick={onClose}
            className="text-xl text-stone-500 hover:text-stone-700"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {shopStock.map((slot) => (
            <ShopItemCard
              key={slot.itemId}
              slot={slot}
              battleStars={battleStars}
              onBuy={handleBuy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
