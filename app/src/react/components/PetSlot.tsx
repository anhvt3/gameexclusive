import type { PetInstance } from '@/types/pet';

interface Props {
  label: string;
  pet: PetInstance | null;
  onClick: () => void;
  disabled?: boolean;
}

export function PetSlot({ label, pet, onClick, disabled }: Props) {
  if (!pet) {
    return (
      <button
        data-testid="pet-slot-empty"
        onClick={onClick}
        disabled={disabled}
        className="flex h-32 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700"
      >
        <span aria-hidden="true" className="text-3xl">
          ➕
        </span>
        <span className="text-xs font-semibold">Pet {label}</span>
      </button>
    );
  }
  return (
    <button
      data-testid="pet-slot-filled"
      onClick={onClick}
      disabled={disabled}
      className="flex h-32 w-24 flex-col items-center justify-center rounded-lg bg-amber-100 ring-2 ring-amber-400"
    >
      <span aria-hidden="true" className="text-3xl">
        🐾
      </span>
      <span className="text-xs font-bold text-amber-900">{pet.petCodename}</span>
      <span className="text-xs text-amber-700">Lv {pet.level}</span>
    </button>
  );
}
