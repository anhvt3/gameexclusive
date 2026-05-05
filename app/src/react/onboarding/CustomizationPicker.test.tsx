import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomizationPicker } from './CustomizationPicker';

describe('CustomizationPicker', () => {
  it('renders gender + hair toggles', () => {
    render(<CustomizationPicker initialGender="male" initialHair="a" onComplete={() => {}} />);
    expect(screen.getByTestId('gender-male')).toBeInTheDocument();
    expect(screen.getByTestId('gender-female')).toBeInTheDocument();
    expect(screen.getByTestId('hair-a')).toBeInTheDocument();
    expect(screen.getByTestId('hair-d')).toBeInTheDocument();
  });

  it('preview hair img src reflects selected gender + hair', () => {
    render(<CustomizationPicker initialGender="male" initialHair="b" onComplete={() => {}} />);
    const hairImg = screen.getByTestId('preview-hair') as HTMLImageElement;
    expect(hairImg.src).toContain('/assets/player/hair/male_hair_b.png');
  });

  it('clicking gender female updates preview src', () => {
    render(<CustomizationPicker initialGender="male" initialHair="a" onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId('gender-female'));
    const hairImg = screen.getByTestId('preview-hair') as HTMLImageElement;
    expect(hairImg.src).toContain('/assets/player/hair/female_hair_a.png');
  });

  it('clicking hair-c updates preview src', () => {
    render(<CustomizationPicker initialGender="male" initialHair="a" onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId('hair-c'));
    const hairImg = screen.getByTestId('preview-hair') as HTMLImageElement;
    expect(hairImg.src).toContain('/assets/player/hair/male_hair_c.png');
  });

  it('Hoàn tất calls onComplete with final gender + hair', () => {
    const onComplete = vi.fn();
    render(<CustomizationPicker initialGender="male" initialHair="a" onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('gender-female'));
    fireEvent.click(screen.getByTestId('hair-d'));
    fireEvent.click(screen.getByTestId('customization-confirm'));
    expect(onComplete).toHaveBeenCalledWith({ gender: 'female', hairStyle: 'd' });
  });
});
