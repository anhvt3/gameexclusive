import { useState } from 'react';
import { useSaveState } from '@/persistence/SaveStateStore';
import { PetSlot } from '@/react/components/PetSlot';
import { EggHatchAnim } from '@/react/components/EggHatchAnim';
import { computeCompatibility, rollOffspring } from '@/domain/PetBreedingEngine';
import { performBreedingStart } from '@/domain/performBreedingStart';
import { performBreedingHatch } from '@/domain/performBreedingHatch';
import { ROSTER_CAP } from '@/types/pet';
import type { PetInstance } from '@/types/pet';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'pick' | 'breeding' | 'hatched';

const COMPAT_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '💔 LOW',
  medium: '💛 MED',
  high: '❤️ HIGH',
};

export function PetBreedingOverlay({ open, onClose }: Props) {
  const ownedPets = useSaveState((s) => s.ownedPets);
  const battleStars = useSaveState((s) => s.battleStars);

  const [parentA, setParentA] = useState<PetInstance | null>(null);
  const [parentB, setParentB] = useState<PetInstance | null>(null);
  const [mode, setMode] = useState<Mode>('pick');

  if (!open) return null;

  const rosterFull = ownedPets.length >= ROSTER_CAP;
  const bothPicked = parentA !== null && parentB !== null;
  const compat = bothPicked ? computeCompatibility(parentA!, parentB!) : null;
  const offspring = bothPicked ? rollOffspring(parentA!, parentB!, () => 0.99) : null;
  const cost = offspring?.costBattleStars ?? 0;
  const insufficient = bothPicked && battleStars < cost;
  const canBreed = bothPicked && !rosterFull && !insufficient && mode === 'pick';

  const handleSlotClick = (which: 'A' | 'B') => {
    const current = which === 'A' ? parentA : parentB;
    const other = which === 'A' ? parentB : parentA;
    const available = ownedPets.filter((p) => p.instanceId !== other?.instanceId);
    if (available.length === 0) return;
    const idx = current ? available.findIndex((p) => p.instanceId === current.instanceId) : -1;
    const next = available[(idx + 1) % available.length]!;
    if (which === 'A') setParentA(next);
    else setParentB(next);
  };

  const handleBreed = async () => {
    if (!parentA || !parentB) return;
    const result = await performBreedingStart(parentA.instanceId, parentB.instanceId);
    if (result.ok) setMode('breeding');
  };

  const handleHatched = () => {
    performBreedingHatch();
    setMode('hatched');
  };

  const handleDone = () => {
    setParentA(null);
    setParentB(null);
    setMode('pick');
    onClose();
  };

  return (
    <div
      data-testid="breed-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-amber-50 p-6 shadow-2xl ring-2 ring-amber-200">
        <header className="mb-4 flex items-center justify-between gap-6">
          <h2 className="text-xl font-bold text-amber-900">🥚 Lai Tạo Pet</h2>
          <span className="text-sm font-semibold text-amber-700">⭐ {battleStars}</span>
          <button
            data-testid="breed-close-btn"
            onClick={onClose}
            className="text-xl text-stone-500"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        {rosterFull && (
          <div
            data-testid="roster-warning"
            className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700"
          >
            Bộ sưu tập đã đầy ({ROSTER_CAP} pet). Hãy thả 1 pet trước khi lai tạo.
          </div>
        )}

        <div className="flex items-center justify-around gap-4">
          <PetSlot label="A" pet={parentA} onClick={() => handleSlotClick('A')} />
          <div className="flex flex-col items-center gap-2">
            {compat && (
              <span data-testid="compat-meter" className="text-sm font-bold">
                {COMPAT_LABEL[compat.level]}
              </span>
            )}
            {mode === 'pick' && offspring && (
              <span data-testid="breed-cost" className="text-xs text-amber-700">
                ⭐ {cost}
              </span>
            )}
            {mode === 'breeding' && <EggHatchAnim onHatched={handleHatched} />}
            {mode === 'hatched' && (
              <span aria-hidden="true" className="text-3xl">
                🌟
              </span>
            )}
          </div>
          <PetSlot label="B" pet={parentB} onClick={() => handleSlotClick('B')} />
        </div>

        <div className="mt-4 flex justify-center">
          {mode === 'pick' && (
            <button
              data-testid="breed-start-btn"
              onClick={handleBreed}
              disabled={!canBreed}
              className="rounded bg-amber-600 px-4 py-2 font-bold text-white disabled:bg-stone-300"
            >
              Bắt đầu lai tạo
            </button>
          )}
          {mode === 'hatched' && (
            <button
              data-testid="breed-done-btn"
              onClick={handleDone}
              className="rounded bg-amber-600 px-4 py-2 font-bold text-white"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
