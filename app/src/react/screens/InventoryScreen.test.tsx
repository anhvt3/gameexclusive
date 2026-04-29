import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InventoryScreen } from './InventoryScreen';
import { useSaveState } from '@persistence/SaveStateStore';
import type { InventoryItem } from '@/types/item';
import { audioManager } from '@/utils/AudioManager';

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

function seed(items: InventoryItem[]): void {
  for (const item of items) useSaveState.getState().addInventoryItem(item);
}

const apprenticeHat: InventoryItem = {
  instanceId: 'uuid-apprentice-hat',
  itemId: 'hat-apprentice-01',
  acquiredAt: 1_700_000_000_000,
};

const fireHat: InventoryItem = {
  instanceId: 'uuid-fire-hat',
  itemId: 'hat-fire-01',
  acquiredAt: 1_700_000_000_100,
};

const fireWand: InventoryItem = {
  instanceId: 'uuid-fire-wand',
  itemId: 'wand-fire-01',
  acquiredAt: 1_700_000_000_200,
};

function renderInventory() {
  return render(
    <MemoryRouter initialEntries={['/inventory']}>
      <Routes>
        <Route path="/" element={<div data-testid="menu">MENU</div>} />
        <Route path="/inventory" element={<InventoryScreen />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('InventoryScreen — Step 22.9', () => {
  it('renders 4 equipment slot cards (hat/outfit/wand/shoes)', () => {
    renderInventory();
    const slots = within(screen.getByTestId('equipment-slots')).getAllByLabelText(/^Ô /);
    expect(slots).toHaveLength(4);
  });

  it('empty inventory shows placeholder message', () => {
    renderInventory();
    expect(screen.getByText(/Chưa có vật phẩm nào/)).toBeInTheDocument();
  });

  it('renders one bag tile per inventory item', () => {
    seed([apprenticeHat, fireWand]);
    renderInventory();
    const tiles = within(screen.getByTestId('bag-grid')).getAllByRole('listitem');
    expect(tiles).toHaveLength(2);
  });

  it('selecting a bag tile opens the detail panel with modifiers + "Trang bị" CTA', () => {
    seed([fireWand]);
    renderInventory();
    fireEvent.click(screen.getByLabelText(/Đũa Hỏa Tinh/));
    const detail = screen.getByLabelText('Chi tiết vật phẩm');
    expect(within(detail).getByRole('heading', { name: /Đũa Hỏa Tinh/ })).toBeInTheDocument();
    expect(within(detail).getByText(/\+10%.*Fire/i)).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /Trang bị/ })).toBeInTheDocument();
  });

  it('clicking "Trang bị" equips the item + updates the slot card + closes detail', () => {
    seed([fireWand]);
    renderInventory();
    fireEvent.click(screen.getByLabelText(/Đũa Hỏa Tinh/));
    fireEvent.click(screen.getByRole('button', { name: /^Trang bị$/ }));
    expect(useSaveState.getState().equipment.wand).toBe('uuid-fire-wand');
    // Slot card now shows the equipped item name
    const wandSlot = document.querySelector('[data-slot="wand"]') as HTMLElement;
    expect(within(wandSlot).getByText(/Đũa Hỏa Tinh/)).toBeInTheDocument();
  });

  it('slot "Tháo" button unequips the item', () => {
    seed([fireWand]);
    useSaveState.getState().equipItem('wand', fireWand.instanceId);
    renderInventory();
    const wandSlot = document.querySelector('[data-slot="wand"]') as HTMLElement;
    fireEvent.click(within(wandSlot).getByRole('button', { name: /Tháo/ }));
    expect(useSaveState.getState().equipment.wand).toBeNull();
  });

  it('equipped bag tile shows badge + detail offers "Tháo vật phẩm"', () => {
    seed([apprenticeHat]);
    useSaveState.getState().equipItem('hat', apprenticeHat.instanceId);
    renderInventory();
    const tile = screen.getByLabelText(/Nón Học Việc.*đang dùng/);
    expect(tile).toBeInTheDocument();
    fireEvent.click(tile);
    const detail = screen.getByLabelText('Chi tiết vật phẩm');
    expect(within(detail).getByRole('button', { name: /Tháo vật phẩm/ })).toBeInTheDocument();
  });

  it('detail "Tháo vật phẩm" clears the slot', () => {
    seed([apprenticeHat]);
    useSaveState.getState().equipItem('hat', apprenticeHat.instanceId);
    renderInventory();
    fireEvent.click(screen.getByLabelText(/Nón Học Việc.*đang dùng/));
    fireEvent.click(screen.getByRole('button', { name: /Tháo vật phẩm/ }));
    expect(useSaveState.getState().equipment.hat).toBeNull();
  });

  it('equipping into an occupied slot replaces the previous item (both stay in inventory)', () => {
    seed([apprenticeHat, fireHat]);
    useSaveState.getState().equipItem('hat', apprenticeHat.instanceId);
    renderInventory();
    fireEvent.click(screen.getByLabelText(/Nón Phù Thủy Lửa/));
    fireEvent.click(screen.getByRole('button', { name: /^Trang bị$/ }));
    expect(useSaveState.getState().equipment.hat).toBe('uuid-fire-hat');
    expect(useSaveState.getState().inventory).toHaveLength(2);
  });

  it('rarity border class follows ItemDef.rarity', () => {
    seed([fireWand]); // rare → border-blue-500
    renderInventory();
    const tile = screen.getByLabelText(/Đũa Hỏa Tinh/);
    expect(tile.className).toContain('border-blue-500');
  });

  it('"Về menu" navigates to /', () => {
    renderInventory();
    fireEvent.click(screen.getByRole('button', { name: /Về menu/ }));
    expect(screen.getByTestId('menu')).toBeInTheDocument();
  });

  it('Step 22.17 — primary "Trang bị" button fires ui_btn_click', () => {
    seed([fireWand]);
    renderInventory();
    const sfx = vi.spyOn(audioManager, 'playSfx');
    fireEvent.click(screen.getByLabelText(/Đũa Hỏa Tinh/));
    fireEvent.click(screen.getByRole('button', { name: /^Trang bị$/ }));
    expect(sfx).toHaveBeenCalledWith('ui_btn_click');
    sfx.mockRestore();
  });

  it('Step 22.17 — slot "Tháo" button fires ui_btn_click', () => {
    seed([fireWand]);
    useSaveState.getState().equipItem('wand', fireWand.instanceId);
    renderInventory();
    const wandSlot = document.querySelector('[data-slot="wand"]') as HTMLElement;
    const sfx = vi.spyOn(audioManager, 'playSfx');
    fireEvent.click(within(wandSlot).getByRole('button', { name: /Tháo/ }));
    expect(sfx).toHaveBeenCalledWith('ui_btn_click');
    sfx.mockRestore();
  });
});
