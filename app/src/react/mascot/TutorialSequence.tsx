/**
 * TutorialSequence — ISP v1.1 Step 18
 *
 * Four-step onboarding narrated by the Sóc mascot. Reads/writes the
 * `tutorial_completed` flag in SaveStateStore so first-time-only logic
 * survives page reloads (persisted to localStorage).
 *
 * Mount at the app shell (above Phaser canvas). Renders nothing once
 * completed. Call onComplete for any post-tutorial side effects
 * (e.g. focus the world canvas, emit a metric).
 */

import { useState } from 'react';
import { useSaveState } from '@persistence/SaveStateStore';
import { MascotDialog } from './MascotDialog';
import { TutorialArrow } from './TutorialArrow';
import { TUTORIAL_FLAG, TUTORIAL_STEPS } from './tutorialSteps';

interface TutorialSequenceProps {
  onComplete?: () => void;
  /** Pass 0 in tests for instant-reveal; production uses MascotDialog default. */
  typingSpeedMs?: number;
}

export function TutorialSequence({ onComplete, typingSpeedMs }: TutorialSequenceProps) {
  const done = useSaveState((s) => s.flags[TUTORIAL_FLAG] === true);
  const setFlag = useSaveState((s) => s.setFlag);
  const [idx, setIdx] = useState(0);

  if (done) return null;

  const step = TUTORIAL_STEPS[idx]!;
  const isLast = idx === TUTORIAL_STEPS.length - 1;

  const handleContinue = () => {
    if (isLast) {
      setFlag(TUTORIAL_FLAG, true);
      onComplete?.();
      return;
    }
    setIdx((i) => i + 1);
  };

  return (
    <>
      {step.target && <TutorialArrow target={step.target} />}
      <MascotDialog
        portraitFile={step.portraitFile}
        text={step.text}
        onContinue={handleContinue}
        continueLabel={isLast ? 'Bắt đầu' : 'Tiếp'}
        {...(typingSpeedMs !== undefined ? { typingSpeedMs } : {})}
      />
    </>
  );
}
