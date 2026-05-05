import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { OnboardingFlow } from './OnboardingFlow';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG, TUTORIAL_STEPS } from '@/react/mascot/tutorialSteps';

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('OnboardingFlow', () => {
  it('renders TutorialSequence when startStep="tutorial" (default)', () => {
    render(<OnboardingFlow onComplete={() => {}} typingSpeedMs={0} />);
    // Mascot dialog wrapper present (role=dialog) with Sóc portrait.
    expect(screen.getByAltText('Sóc')).toBeInTheDocument();
  });

  it('after tutorial completes (8 clicks), advances to NamePicker', () => {
    render(<OnboardingFlow onComplete={() => {}} typingSpeedMs={0} />);
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp|Bắt đầu/ }));
    }
    expect(screen.getByText(/Chọn tên của bạn/)).toBeInTheDocument();
  });

  it('startStep="name" skips directly to NamePicker', () => {
    render(<OnboardingFlow onComplete={() => {}} startStep="name" />);
    expect(screen.getByText(/Chọn tên của bạn/)).toBeInTheDocument();
  });

  it('after name pick, persists playerName + gender, advances to CustomizationPicker', () => {
    render(<OnboardingFlow onComplete={() => {}} startStep="name" />);
    fireEvent.click(screen.getByTestId('name-preset-Minh'));
    expect(useSaveState.getState().playerName).toBe('Minh');
    expect(useSaveState.getState().gender).toBe('male');
    expect(screen.getByText(/Tuỳ chỉnh nhân vật/)).toBeInTheDocument();
  });

  it('after customization confirm, persists hairStyle and sets TUTORIAL_FLAG=true', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} startStep="customization" />);
    fireEvent.click(screen.getByTestId('hair-c'));
    fireEvent.click(screen.getByTestId('customization-confirm'));
    expect(useSaveState.getState().hairStyle).toBe('c');
    expect(useSaveState.getState().flags[TUTORIAL_FLAG]).toBe(true);
    expect(onComplete).toHaveBeenCalled();
  });

  it('startStep="tutorial-only" replays tutorial without name+customization', () => {
    useSaveState.getState().setPlayerName('Minh');
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} startStep="tutorial-only" typingSpeedMs={0} />);
    expect(screen.getByAltText('Sóc')).toBeInTheDocument();
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp|Bắt đầu/ }));
    }
    // Should NOT advance to NamePicker
    expect(screen.queryByText(/Chọn tên của bạn/)).toBeNull();
    // Should call onComplete
    expect(onComplete).toHaveBeenCalled();
    expect(useSaveState.getState().flags[TUTORIAL_FLAG]).toBe(true);
  });
});
