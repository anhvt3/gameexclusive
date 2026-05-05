import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NamePicker } from './NamePicker';

describe('NamePicker', () => {
  it('renders 12 preset cards', () => {
    render(<NamePicker onPick={() => {}} />);
    expect(screen.getAllByTestId(/^name-preset-/)).toHaveLength(12);
  });

  it('renders Random button', () => {
    render(<NamePicker onPick={() => {}} />);
    expect(screen.getByTestId('name-random')).toBeInTheDocument();
  });

  it('clicking a preset calls onPick with name + gender', () => {
    const onPick = vi.fn();
    render(<NamePicker onPick={onPick} />);
    fireEvent.click(screen.getByTestId('name-preset-Minh'));
    expect(onPick).toHaveBeenCalledWith({ name: 'Minh', gender: 'male' });
  });

  it('clicking Random with seeded rng=0 picks first preset (Minh)', () => {
    const onPick = vi.fn();
    render(<NamePicker onPick={onPick} rng={() => 0} />);
    fireEvent.click(screen.getByTestId('name-random'));
    expect(onPick).toHaveBeenCalledWith({ name: 'Minh', gender: 'male' });
  });

  it('clicking Random with rng=0.999 picks last preset (Châu)', () => {
    const onPick = vi.fn();
    render(<NamePicker onPick={onPick} rng={() => 0.999} />);
    fireEvent.click(screen.getByTestId('name-random'));
    expect(onPick).toHaveBeenCalledWith({ name: 'Châu', gender: 'female' });
  });

  it('groups male and female presets in separate sections', () => {
    render(<NamePicker onPick={() => {}} />);
    expect(screen.getByTestId('name-section-male')).toBeInTheDocument();
    expect(screen.getByTestId('name-section-female')).toBeInTheDocument();
  });
});
