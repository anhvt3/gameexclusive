/**
 * PlayScreen — ISP v1.1 Step 21.
 *
 * Hosts the live game: PhaserGame canvas + QuizOverlay + Tutorial
 * dialog layer. Pure composition — all gameplay state flows through
 * EventBus + SaveStateStore wired at the app shell.
 */

import { PhaserGame } from '@game/PhaserGame';
import { QuizOverlay } from '@react/quiz/QuizOverlay';
import { TutorialSequence } from '@react/mascot/TutorialSequence';

export function PlayScreen() {
  return (
    <div className="play-screen relative h-screen w-screen bg-slate-900">
      <PhaserGame />
      <QuizOverlay />
      <TutorialSequence />
    </div>
  );
}
