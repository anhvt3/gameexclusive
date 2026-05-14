import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PetBreedingOverlay } from './PetBreedingOverlay';
import { useSaveState } from '@/persistence/SaveStateStore';
import { ROSTER_CAP } from '@/types/pet';

describe('PetBreedingOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when open=false', () => {
    render(<PetBreedingOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('breed-overlay')).not.toBeInTheDocument();
  });

  it('renders 2 empty pet slots when open + no parents picked', () => {
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    const emptySlots = screen.getAllByTestId('pet-slot-empty');
    expect(emptySlots.length).toBe(2);
  });

  it('shows roster_full warning when ownedPets at cap', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('pyropup', 'common', 1, 0);
    }
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('roster-warning')).toBeInTheDocument();
  });

  it('breed button disabled until 2 parents picked', () => {
    useSaveState.getState().addPet('pyropup', 'common', 3, 0);
    useSaveState.getState().addPet('aquakit', 'common', 5, 0);
    useSaveState.getState().addBattleStars(500);
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('breed-start-btn')).toBeDisabled();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<PetBreedingOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('breed-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking empty slot cycles through ownedPets', () => {
    useSaveState.getState().addPet('pyropup', 'common', 3, 0);
    useSaveState.getState().addPet('aquakit', 'common', 5, 0);
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    const slots = screen.getAllByTestId('pet-slot-empty');
    fireEvent.click(slots[0]!);
    // After click, slot A is filled — at least one slot-filled exists now
    expect(screen.queryByTestId('pet-slot-filled')).toBeInTheDocument();
  });
});

describe('PetBreedingOverlay — Phase 4 timer states', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('shows countdown when chamber.hatchAt > now', () => {
    useSaveState.getState().addBattleStars(500);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: Date.now(),
      hatchAt: Date.now() + 100_000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('breeding-countdown')).toBeInTheDocument();
  });

  it('shows ready state (hatch button) when chamber.hatchAt <= now', () => {
    useSaveState.getState().addBattleStars(500);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: Date.now() - 1000,
      hatchAt: Date.now() - 500,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('breeding-hatch-btn')).toBeInTheDocument();
  });
});
