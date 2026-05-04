/**
 * PetRescueOverlay — Sprint C Task 9.
 *
 * React modal that listens for PET_RESCUE_OFFERED on the bus and lets
 * the player collect or release the offered pet. When the roster is at
 * ROSTER_CAP, the collect button swaps the modal into a release-picker
 * grid so the player can replace one of their existing pets.
 *
 * Mirrors the RewardChestOverlay pattern (mounted once at app shell,
 * renders nothing while idle).
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { findPetDef } from '@data/staticConfig/pets';
import {
  RARITY_BORDER_CLASS,
  RARITY_GLOW_CLASS,
  RARITY_LABEL_VI,
  ROSTER_CAP,
  type PetCodename,
  type PetInstance,
  type PetRarity,
} from '@/types/pet';

interface Offer {
  codename: PetCodename;
  rarity: PetRarity;
}

export function PetRescueOverlay() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const ownedPets = useSaveState((s) => s.ownedPets);

  useEffect(() => {
    const off = eventBus.on('PET_RESCUE_OFFERED', ({ petCodename, rarity }) => {
      setOffer({ codename: petCodename, rarity });
    });
    return off;
  }, []);

  if (!offer) return null;
  const def = findPetDef(offer.codename);
  if (!def) return null;

  const handleCollect = () => {
    if (useSaveState.getState().hasPetAtCap()) {
      setShowPicker(true);
      return;
    }
    const inst = useSaveState.getState().addPet(offer.codename, offer.rarity);
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: inst.instanceId,
      petCodename: offer.codename,
      rarity: offer.rarity,
    });
    setOffer(null);
  };

  const handleRelease = () => {
    eventBus.emit('PET_RELEASED', {
      petCodename: offer.codename,
      rarity: offer.rarity,
      reason: 'rejected-offer',
    });
    setOffer(null);
  };

  const handleCapPick = (instanceId: string) => {
    const removed = useSaveState.getState().ownedPets.find((p) => p.instanceId === instanceId);
    useSaveState.getState().removePet(instanceId);
    if (removed) {
      eventBus.emit('PET_RELEASED', {
        petCodename: removed.petCodename,
        rarity: removed.rarity,
        reason: 'roster-cap-replace',
      });
    }
    const inst = useSaveState.getState().addPet(offer.codename, offer.rarity);
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: inst.instanceId,
      petCodename: offer.codename,
      rarity: offer.rarity,
    });
    setShowPicker(false);
    setOffer(null);
  };

  const handleCapCancel = () => {
    setShowPicker(false);
    setOffer(null);
  };

  if (showPicker) {
    return (
      <div
        data-testid="pet-rescue-cap-picker"
        role="dialog"
        aria-label="Chọn pet để thả"
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            Bạn đã có {ROSTER_CAP} pet — chọn 1 để thả đi
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {ownedPets.map((p: PetInstance) => (
              <button
                key={p.instanceId}
                type="button"
                data-testid={`pet-rescue-cap-pick-${p.instanceId}`}
                onClick={() => handleCapPick(p.instanceId)}
                className={`rounded-lg border-2 p-2 transition hover:scale-105 ${RARITY_BORDER_CLASS[p.rarity]} ${RARITY_GLOW_CLASS[p.rarity]}`}
              >
                <img
                  src={`/assets/pets/${p.petCodename}_idle_256.png`}
                  alt={p.petCodename}
                  className="mx-auto h-16 w-16 object-contain"
                />
                <div className="mt-1 text-xs font-semibold">Lv{p.level}</div>
                <div className="text-[10px] text-slate-600">{RARITY_LABEL_VI[p.rarity]}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="pet-rescue-cap-cancel"
            onClick={handleCapCancel}
            className="mt-4 w-full rounded-lg bg-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-400"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pet-rescue-overlay"
      role="dialog"
      aria-label="Cứu pet"
      className={`fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${
        offer.rarity === 'legendary' ? 'animate-pulse' : ''
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-3xl border-4 bg-white p-6 shadow-2xl ${RARITY_BORDER_CLASS[offer.rarity]} ${RARITY_GLOW_CLASS[offer.rarity]}`}
      >
        <h2 className="mb-2 text-center text-xl font-extrabold text-slate-800">
          Bạn đã cứu được một pet!
        </h2>
        <img
          src={`/assets/pets/${offer.codename}_idle_256.png`}
          alt={offer.codename}
          className="mx-auto h-40 w-40 object-contain"
        />
        <div className="mt-2 text-center text-lg font-bold text-slate-800">{def.displayNameVi}</div>
        <div className="text-center text-sm text-slate-600">{RARITY_LABEL_VI[offer.rarity]}</div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            data-testid="pet-rescue-collect"
            onClick={handleCollect}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 font-bold text-white shadow hover:bg-emerald-600"
          >
            Thu thập
          </button>
          <button
            type="button"
            data-testid="pet-rescue-release"
            onClick={handleRelease}
            className="flex-1 rounded-lg bg-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-400"
          >
            Thả đi
          </button>
        </div>
      </div>
    </div>
  );
}
