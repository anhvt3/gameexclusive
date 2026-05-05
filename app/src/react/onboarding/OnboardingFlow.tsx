/**
 * OnboardingFlow — Sprint E Task 8
 *
 * Orchestrates the first-launch onboarding sequence:
 *   tutorial → name → customization → done.
 *
 * `startStep` allows:
 *  - 'tutorial' (default) — full sequence (first launch via MainMenu)
 *  - 'name' / 'customization' — jump-in for tests / partial flows
 *  - 'tutorial-only' — replay just the tutorial (Settings panel)
 *
 * Each step persists via SaveState setters as it completes. The final
 * step (customization confirm OR tutorial completion in replay mode)
 * sets TUTORIAL_FLAG=true and invokes the `onComplete` prop.
 *
 * Layer 1 Presentation — no Phaser imports (AP 3.1).
 */

import { useEffect, useState } from 'react';
import { TutorialSequence } from '@/react/mascot/TutorialSequence';
import { TUTORIAL_FLAG } from '@/react/mascot/tutorialSteps';
import { useSaveState } from '@persistence/SaveStateStore';
import { NamePicker } from './NamePicker';
import { CustomizationPicker } from './CustomizationPicker';
import type { Gender, HairStyle } from '@/types/identity';
import type { NamePreset } from '@data/staticConfig/namePresets';

type Step = 'tutorial' | 'name' | 'customization' | 'done';
type StartStep = 'tutorial' | 'name' | 'customization' | 'tutorial-only';

interface Props {
  onComplete: () => void;
  startStep?: StartStep;
  /** Forwarded to TutorialSequence — 0 in tests for instant reveal. */
  typingSpeedMs?: number;
}

export function OnboardingFlow({ onComplete, startStep = 'tutorial', typingSpeedMs }: Props) {
  const [step, setStep] = useState<Step>(startStep === 'tutorial-only' ? 'tutorial' : startStep);
  const isReplay = startStep === 'tutorial-only';

  // TutorialSequence auto-hides when TUTORIAL_FLAG is true. When the
  // flow mounts at the tutorial step (fresh first-launch OR Settings
  // replay), force the flag false so the sequence renders. The final
  // tutorial step re-sets the flag to true on completion.
  useEffect(() => {
    if (step === 'tutorial') {
      useSaveState.getState().setFlag(TUTORIAL_FLAG, false);
    }
    // Run only on initial mount for the chosen startStep — subsequent
    // step transitions are driven by user interactions, not flag flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTutorialDone = () => {
    if (isReplay) {
      // Tutorial sequence already set TUTORIAL_FLAG=true; just exit.
      setStep('done');
      onComplete();
    } else {
      setStep('name');
    }
  };

  const handleNamePick = (preset: NamePreset) => {
    const s = useSaveState.getState();
    s.setPlayerName(preset.name);
    s.setGender(preset.gender);
    setStep('customization');
  };

  const handleCustomizationDone = (sel: { gender: Gender; hairStyle: HairStyle }) => {
    const s = useSaveState.getState();
    s.setGender(sel.gender);
    s.setHairStyle(sel.hairStyle);
    s.setFlag(TUTORIAL_FLAG, true);
    setStep('done');
    onComplete();
  };

  if (step === 'done') return null;

  return (
    <div
      data-testid="onboarding-flow"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
    >
      {step === 'tutorial' && (
        <TutorialSequence
          onComplete={handleTutorialDone}
          {...(typingSpeedMs !== undefined ? { typingSpeedMs } : {})}
        />
      )}
      {step === 'name' && <NamePicker onPick={handleNamePick} />}
      {step === 'customization' && (
        <CustomizationPicker
          initialGender={useSaveState.getState().gender}
          initialHair={useSaveState.getState().hairStyle}
          onComplete={handleCustomizationDone}
        />
      )}
    </div>
  );
}
