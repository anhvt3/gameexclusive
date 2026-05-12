import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PetSlot } from './PetSlot';
import type { PetInstance } from '@/types/pet';

const mockPet: PetInstance = {
  instanceId: 'inst-1',
  petCodename: 'pyropup',
  rarity: 'common',
  level: 5,
  xp: 0,
  capturedAt: 0,
};

describe('PetSlot', () => {
  it('renders empty state when pet is null', () => {
    render(<PetSlot label="A" pet={null} onClick={() => {}} />);
    expect(screen.getByTestId('pet-slot-empty')).toBeInTheDocument();
  });

  it('renders filled state with codename + level', () => {
    render(<PetSlot label="A" pet={mockPet} onClick={() => {}} />);
    expect(screen.getByTestId('pet-slot-filled')).toBeInTheDocument();
    expect(screen.getByTestId('pet-slot-filled')).toHaveTextContent('Lv 5');
  });

  it('clicking empty slot calls onClick', () => {
    const onClick = vi.fn();
    render(<PetSlot label="A" pet={null} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('pet-slot-empty'));
    expect(onClick).toHaveBeenCalled();
  });
});
