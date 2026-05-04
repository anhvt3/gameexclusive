/**
 * PetRescueOverlay tests — Sprint C Task 9.
 *
 * Verifies normal collect path, release path, and the roster-cap
 * picker subflow (replace-old / cancel).
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { PetRescueOverlay } from './PetRescueOverlay';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { ROSTER_CAP } from '@/types/pet';

describe('PetRescueOverlay', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders nothing initially', () => {
    render(<PetRescueOverlay />);
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('opens with pet display name + rarity badge on PET_RESCUE_OFFERED', () => {
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    expect(screen.getByTestId('pet-rescue-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Thỏ Lá/)).toBeInTheDocument();
    expect(screen.getByText(/Hiếm/)).toBeInTheDocument();
  });

  it('Thu thập button mints pet, fires PET_COLLECTED, closes overlay', () => {
    const events: Array<{ petCodename: string }> = [];
    const off = eventBus.on('PET_COLLECTED', (p) => events.push(p));
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    off();
    expect(useSaveState.getState().ownedPets).toHaveLength(1);
    expect(events[0]!.petCodename).toBe('bunbleaf');
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('Thả đi button fires PET_RELEASED with reason=rejected-offer + closes overlay', () => {
    const events: Array<{ petCodename: string; rarity: string; reason: string }> = [];
    const off = eventBus.on('PET_RELEASED', (p) => events.push(p));
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-release'));
    off();
    expect(useSaveState.getState().ownedPets).toHaveLength(0);
    expect(events[0]).toEqual({
      petCodename: 'bunbleaf',
      rarity: 'rare',
      reason: 'rejected-offer',
    });
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('shows release-picker when at ROSTER_CAP and player chooses Thu thập', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    expect(screen.getByTestId('pet-rescue-cap-picker')).toBeInTheDocument();
  });

  it('release-picker pick → release old pet + mint new pet', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    const firstId = useSaveState.getState().ownedPets[0]!.instanceId;
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    fireEvent.click(screen.getByTestId(`pet-rescue-cap-pick-${firstId}`));
    expect(useSaveState.getState().ownedPets.length).toBe(ROSTER_CAP);
    expect(useSaveState.getState().findOwnedPet(firstId)).toBeNull();
    expect(useSaveState.getState().ownedPets.some((p) => p.petCodename === 'pyropup')).toBe(true);
  });

  it('release-picker cancel discards offer silently', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    fireEvent.click(screen.getByTestId('pet-rescue-cap-cancel'));
    expect(useSaveState.getState().ownedPets.length).toBe(ROSTER_CAP);
    expect(useSaveState.getState().ownedPets.some((p) => p.petCodename === 'pyropup')).toBe(false);
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });
});
