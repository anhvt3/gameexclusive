/**
 * InventoryScreen — ISP v1.1 Step 22.9.
 *
 * Kho đồ: 4 equipment slots on top, bag grid below, optional detail
 * panel when a bag tile is selected. Pure SaveStateStore consumer —
 * equip/unequip actions flow through the store so Phaser scenes that
 * observe equipment changes (Step 22.12 layered rendering) pick them
 * up automatically.
 *
 * Route: /inventory (registered in AppRouter). Reachable from MainMenu
 * "Kho đồ" button.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaveState } from '@persistence/SaveStateStore';
import { ITEM_SLOTS, type EquipmentSlot, type ItemRarity } from '@/types/item';
import { findItemDef, type ItemDef } from '@data/staticConfig/items';
import { useGameAudio } from '@react/shell/useGameAudio';
import { eventBus } from '@/bus/EventBus';
import {
  RARITY_BORDER_CLASS,
  RARITY_GLOW_CLASS,
  RARITY_LABEL_VI,
  type PetInstance,
} from '@/types/pet';
import { findPetDef } from '@data/staticConfig/pets';

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  hat: 'Mũ',
  outfit: 'Áo choàng',
  wand: 'Đũa phép',
  shoes: 'Giày',
};

const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-amber-500',
};

const RARITY_LABEL: Record<ItemRarity, string> = {
  common: 'Thường',
  rare: 'Hiếm',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
};

function formatModifier(mod: ItemDef['modifiers'][number]): string {
  switch (mod.kind) {
    case 'maxHp':
      return `+${mod.delta} HP tối đa`;
    case 'spellDamage':
      return `+${mod.pct}% sát thương ${mod.element}`;
    case 'critChance':
      return `+${mod.pct}% tỉ lệ chí mạng`;
    case 'expGain':
      return `+${mod.pct}% EXP nhận được`;
  }
}

export function InventoryScreen() {
  const navigate = useNavigate();
  const equipment = useSaveState((s) => s.equipment);
  const inventory = useSaveState((s) => s.inventory);
  const equipItem = useSaveState((s) => s.equipItem);
  const unequipItem = useSaveState((s) => s.unequipItem);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [tab, setTab] = useState<'items' | 'pets'>('items');
  const [confirmRelease, setConfirmRelease] = useState<PetInstance | null>(null);
  const ownedPets = useSaveState((s) => s.ownedPets);
  const activePetId = useSaveState((s) => s.active_pet_instance_id);
  const { playSfx } = useGameAudio();

  const handleEquipPet = (instanceId: string) => {
    useSaveState.getState().setActivePetInstanceId(instanceId);
  };

  const handleReleaseConfirm = () => {
    if (!confirmRelease) return;
    useSaveState.getState().removePet(confirmRelease.instanceId);
    eventBus.emit('PET_RELEASED', {
      petCodename: confirmRelease.petCodename,
      rarity: confirmRelease.rarity,
      reason: 'manual',
    });
    setConfirmRelease(null);
  };
  // Step 22.17 — only primary actions get audio. Bag-tile selection skips
  // hover SFX (would spam) but still fires click on selection so kids
  // get feedback when they pick an item.
  const onHover = () => playSfx('ui_btn_hover');
  const click = (action: () => void) => () => {
    playSfx('ui_btn_click');
    action();
  };

  const equippedInstanceIds = new Set(
    Object.values(equipment).filter((id): id is string => id !== null)
  );

  const selectedEntry = selectedInstanceId
    ? (() => {
        const inst = inventory.find((i) => i.instanceId === selectedInstanceId);
        const def = inst ? findItemDef(inst.itemId) : undefined;
        return inst && def ? { inst, def } : null;
      })()
    : null;

  const handleEquip = () => {
    if (!selectedEntry) return;
    equipItem(selectedEntry.def.slot, selectedEntry.inst.instanceId);
    setSelectedInstanceId(null);
  };

  return (
    <main
      aria-label="Kho đồ"
      className="inventory-screen min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 px-4 py-8"
    >
      <header className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-900">Kho đồ</h1>
          <p className="text-sm text-amber-700">
            Trang bị mỗi ô {ITEM_SLOTS.length} loại để tăng chỉ số.
          </p>
        </div>
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={click(() => navigate('/'))}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
        >
          Về menu
        </button>
      </header>

      {/* Tab bar */}
      <div className="mx-auto mb-4 flex max-w-4xl gap-2">
        <button
          type="button"
          data-testid="inventory-tab-items"
          onClick={() => setTab('items')}
          className={`rounded-t px-4 py-2 text-sm ${
            tab === 'items'
              ? 'border-b-2 border-amber-500 font-bold text-amber-900'
              : 'text-stone-600 hover:text-amber-700'
          }`}
        >
          Đồ
        </button>
        <button
          type="button"
          data-testid="inventory-tab-pets"
          onClick={() => setTab('pets')}
          className={`rounded-t px-4 py-2 text-sm ${
            tab === 'pets'
              ? 'border-b-2 border-amber-500 font-bold text-amber-900'
              : 'text-stone-600 hover:text-amber-700'
          }`}
        >
          Pet
        </button>
      </div>

      {tab === 'items' && (
        <>
          {/* Equipment slot strip */}
          <section
            aria-label="Đang trang bị"
            className="mx-auto mb-6 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="equipment-slots"
          >
            {ITEM_SLOTS.map((slot) => {
              const instanceId = equipment[slot];
              const inst = instanceId ? inventory.find((i) => i.instanceId === instanceId) : null;
              const def = inst ? findItemDef(inst.itemId) : undefined;
              return (
                <div
                  key={slot}
                  data-slot={slot}
                  aria-label={`Ô ${SLOT_LABELS[slot]}`}
                  className={[
                    'flex flex-col items-center gap-2 rounded-xl border-2 bg-white p-3 shadow-sm transition',
                    def ? RARITY_BORDER[def.rarity] : 'border-dashed border-stone-300',
                  ].join(' ')}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {SLOT_LABELS[slot]}
                  </span>
                  {def ? (
                    <>
                      <img
                        src={def.iconPath}
                        alt={def.displayNameVi}
                        className="h-16 w-16 object-contain"
                      />
                      <span className="truncate text-center text-sm font-medium text-stone-800">
                        {def.displayNameVi}
                      </span>
                      <button
                        type="button"
                        onMouseEnter={onHover}
                        onClick={click(() => unequipItem(slot))}
                        className="rounded-md bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-300"
                      >
                        Tháo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center text-stone-300">
                        <span className="text-3xl">∅</span>
                      </div>
                      <span className="text-xs italic text-stone-400">Trống</span>
                    </>
                  )}
                </div>
              );
            })}
          </section>

          {/* Bag grid + detail panel */}
          <section className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_18rem]">
            <div data-testid="bag-grid">
              <h2 className="mb-2 text-lg font-bold text-amber-900">Túi đồ</h2>
              {inventory.length === 0 ? (
                <p className="rounded-lg bg-white p-6 text-center text-sm italic text-stone-500">
                  Chưa có vật phẩm nào. Đánh quái hoặc lên cấp để nhận đồ!
                </p>
              ) : (
                <ul role="list" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {inventory.map((inst) => {
                    const def = findItemDef(inst.itemId);
                    if (!def) return null;
                    const equipped = equippedInstanceIds.has(inst.instanceId);
                    const selected = selectedInstanceId === inst.instanceId;
                    return (
                      <li key={inst.instanceId}>
                        <button
                          type="button"
                          onClick={() => setSelectedInstanceId(inst.instanceId)}
                          aria-label={`${def.displayNameVi}${equipped ? ' (đang dùng)' : ''}`}
                          aria-pressed={selected}
                          data-instance-id={inst.instanceId}
                          className={[
                            'relative flex w-full flex-col items-center gap-1 rounded-xl border-2 bg-white p-2 transition',
                            RARITY_BORDER[def.rarity],
                            selected ? 'ring-2 ring-amber-500' : '',
                            equipped ? 'opacity-70' : 'hover:shadow-md',
                          ].join(' ')}
                        >
                          <img src={def.iconPath} alt="" className="h-12 w-12 object-contain" />
                          <span className="truncate text-xs font-medium text-stone-800">
                            {def.displayNameVi}
                          </span>
                          {equipped && (
                            <span className="absolute right-1 top-1 rounded bg-emerald-500 px-1 text-[10px] font-bold text-white">
                              ✓
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Detail panel */}
            <aside
              aria-label="Chi tiết vật phẩm"
              className="rounded-xl border border-amber-200 bg-white p-4 shadow"
            >
              {selectedEntry ? (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={selectedEntry.def.iconPath}
                      alt=""
                      className="h-16 w-16 object-contain"
                    />
                    <div>
                      <h3 className="text-base font-bold text-stone-900">
                        {selectedEntry.def.displayNameVi}
                      </h3>
                      <p
                        className={[
                          'text-xs font-semibold',
                          selectedEntry.def.rarity === 'common' && 'text-stone-500',
                          selectedEntry.def.rarity === 'rare' && 'text-blue-600',
                          selectedEntry.def.rarity === 'epic' && 'text-purple-600',
                          selectedEntry.def.rarity === 'legendary' && 'text-amber-600',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {RARITY_LABEL[selectedEntry.def.rarity]} ·{' '}
                        {SLOT_LABELS[selectedEntry.def.slot]}
                      </p>
                    </div>
                  </div>
                  <ul className="mb-3 space-y-1 text-sm text-stone-700">
                    {selectedEntry.def.modifiers.map((mod, i) => (
                      <li key={i} className="rounded bg-amber-50 px-2 py-1">
                        {formatModifier(mod)}
                      </li>
                    ))}
                  </ul>
                  {equippedInstanceIds.has(selectedEntry.inst.instanceId) ? (
                    <button
                      type="button"
                      onMouseEnter={onHover}
                      onClick={click(() => {
                        unequipItem(selectedEntry.def.slot);
                        setSelectedInstanceId(null);
                      })}
                      className="w-full rounded-lg bg-stone-200 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-300"
                    >
                      Tháo vật phẩm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onMouseEnter={onHover}
                      onClick={click(handleEquip)}
                      className="w-full rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white shadow hover:bg-orange-700"
                    >
                      Trang bị
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm italic text-stone-500">
                  Chọn một vật phẩm trong túi để xem chi tiết.
                </p>
              )}
            </aside>
          </section>
        </>
      )}

      {tab === 'pets' && (
        <section
          aria-label="Pet đang sở hữu"
          className="mx-auto max-w-4xl"
          data-testid="pet-roster"
        >
          {ownedPets.length === 0 ? (
            <p className="rounded-lg bg-white p-6 text-center text-sm italic text-stone-500">
              Chưa có pet — đánh quái để cứu pet đầu tiên!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {ownedPets.map((p) => {
                const def = findPetDef(p.petCodename);
                const isActive = p.instanceId === activePetId;
                return (
                  <button
                    type="button"
                    key={p.instanceId}
                    data-testid={`pet-card-${p.instanceId}`}
                    onClick={() => handleEquipPet(p.instanceId)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setConfirmRelease(p);
                    }}
                    className={[
                      'relative flex flex-col items-center gap-1 rounded-xl border-2 bg-white p-3 transition hover:shadow-md',
                      RARITY_BORDER_CLASS[p.rarity],
                      RARITY_GLOW_CLASS[p.rarity],
                    ].join(' ')}
                  >
                    {isActive && (
                      <span
                        data-testid={`pet-active-indicator-${p.instanceId}`}
                        className="absolute -top-2 -left-2 text-xl text-amber-400"
                        aria-label="Pet đang được chọn"
                      >
                        ★
                      </span>
                    )}
                    <img
                      src={`/assets/pets/${p.petCodename}_idle_256.png`}
                      alt={def?.displayNameVi ?? p.petCodename}
                      className="h-16 w-16 object-contain"
                    />
                    <span className="truncate text-sm font-medium text-stone-800">
                      {def?.displayNameVi ?? p.petCodename}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Lv{p.level} · {RARITY_LABEL_VI[p.rarity]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {confirmRelease && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-label="Xác nhận thả pet"
        >
          <div className="max-w-xs rounded-xl bg-white p-4 shadow-xl">
            <p className="mb-3 text-sm text-stone-800">
              Thả pet{' '}
              <strong>
                {findPetDef(confirmRelease.petCodename)?.displayNameVi ??
                  confirmRelease.petCodename}
              </strong>
              ? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="pet-release-confirm"
                onClick={handleReleaseConfirm}
                className="flex-1 rounded bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Thả
              </button>
              <button
                type="button"
                onClick={() => setConfirmRelease(null)}
                className="flex-1 rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-slate-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
