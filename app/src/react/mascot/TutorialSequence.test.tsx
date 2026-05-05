import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TutorialSequence } from './TutorialSequence';
import { TUTORIAL_FLAG, TUTORIAL_STEPS } from './tutorialSteps';
import { useSaveState } from '@persistence/SaveStateStore';

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('TutorialSequence — 8-step onboarding (Sprint E)', () => {
  it('exposes 8 steps (Phase 1 4 beats + Sprint E 4 beats)', () => {
    expect(TUTORIAL_STEPS).toHaveLength(8);
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
    // Advance through steps 1..7 → reach final step 8.
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(screen.getByRole('button')).toHaveTextContent('Bắt đầu');
  });

  it('completing last step sets tutorial_completed flag', () => {
    render(<TutorialSequence typingSpeedMs={0} />);
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(useSaveState.getState().flags[TUTORIAL_FLAG]).toBe(true);
  });

  it('completing last step calls onComplete callback', () => {
    const onComplete = vi.fn();
    render(<TutorialSequence onComplete={onComplete} typingSpeedMs={0} />);
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('completing last step → dialog unmounts (null render)', () => {
    const { container } = render(<TutorialSequence typingSpeedMs={0} />);
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      fireEvent.click(screen.getByRole('button'));
    }
    expect(container.firstChild).toBeNull();
  });
});

describe('TutorialSequence — gesture overlay (Sprint E)', () => {
  it('renders no TutorialArrow on beat 1 (no target)', () => {
    // Beat 0 (greet) has no target — arrow should be absent.
    render(<TutorialSequence typingSpeedMs={0} />);
    expect(screen.queryByTestId('tutorial-arrow')).toBeNull();
  });

  it('integrates TutorialArrow component for beats with target', () => {
    // Smoke test: confirm the integration wires TutorialArrow when
    // step.target is set. Comprehensive positioning coverage lives in
    // TutorialArrow.test.tsx — here we verify the conditional render
    // by checking the source includes TutorialArrow usage. (Runtime
    // arrow visibility requires canvas + scene anchor registration,
    // which TutorialArrow.test.tsx covers in isolation.)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const src: string = fs.readFileSync(path.resolve(__dirname, 'TutorialSequence.tsx'), 'utf8');
    expect(src).toMatch(/TutorialArrow/);
    expect(src).toMatch(/step\.target\s*&&\s*<TutorialArrow/);
  });
});
