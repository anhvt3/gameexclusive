import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TutorialSequence } from './TutorialSequence';
import { TUTORIAL_FLAG, TUTORIAL_STEPS } from './tutorialSteps';
import { useSaveState } from '@persistence/SaveStateStore';

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('TutorialSequence — 4-step onboarding', () => {
  it('exposes 4 steps (greet → talk → think → cheer)', () => {
    expect(TUTORIAL_STEPS).toHaveLength(4);
    expect(TUTORIAL_STEPS[0]!.portraitFile).toContain('greet');
    expect(TUTORIAL_STEPS[1]!.portraitFile).toContain('talk');
    expect(TUTORIAL_STEPS[2]!.portraitFile).toContain('think');
    expect(TUTORIAL_STEPS[3]!.portraitFile).toContain('cheer');
  });

  it('renders null when tutorial_completed flag is true', () => {
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    const { container } = render(<TutorialSequence />);
    expect(container.firstChild).toBeNull();
  });

  it('renders first step (greet) when flag not set', () => {
    render(<TutorialSequence typingSpeedMs={0} />);
    const img = screen.getByAltText('Sóc') as HTMLImageElement;
    expect(img.src).toContain('greet');
  });

  it('clicking "Tiếp" advances through each step', () => {
    render(<TutorialSequence typingSpeedMs={0} />);
    const img = () => screen.getByAltText('Sóc') as HTMLImageElement;
    expect(img().src).toContain('greet');
    fireEvent.click(screen.getByRole('button'));
    expect(img().src).toContain('talk');
    fireEvent.click(screen.getByRole('button'));
    expect(img().src).toContain('think');
    fireEvent.click(screen.getByRole('button'));
    expect(img().src).toContain('cheer');
  });

  it('last step button label is "Bắt đầu"', () => {
    render(<TutorialSequence typingSpeedMs={0} />);
    fireEvent.click(screen.getByRole('button')); // → step 2
    fireEvent.click(screen.getByRole('button')); // → step 3
    fireEvent.click(screen.getByRole('button')); // → step 4 (cheer)
    expect(screen.getByRole('button')).toHaveTextContent('Bắt đầu');
  });

  it('completing last step sets tutorial_completed flag', () => {
    render(<TutorialSequence typingSpeedMs={0} />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(useSaveState.getState().flags[TUTORIAL_FLAG]).toBe(true);
  });

  it('completing last step calls onComplete callback', () => {
    const onComplete = vi.fn();
    render(<TutorialSequence onComplete={onComplete} typingSpeedMs={0} />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('completing last step → dialog unmounts (null render)', () => {
    const { container } = render(<TutorialSequence typingSpeedMs={0} />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(container.firstChild).toBeNull();
  });
});
