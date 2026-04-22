/**
 * MascotDialog — ISP v1.1 Step 18
 *
 * Presentational React dialog for the Sóc mascot. Char-by-char typewriter
 * reveal; button label flips from "Bỏ qua" (skip) to caller-supplied
 * continueLabel once full text is shown. Click during typing → jump to
 * full text without firing onContinue.
 *
 * Layer 1 Presentation — no Phaser imports (AP 3.1).
 */

import { useEffect, useState } from 'react';

interface MascotDialogProps {
  /** Filename in /assets/mascot/ — e.g. "soc_guide_greet.png" */
  portraitFile: string;
  text: string;
  onContinue: () => void;
  continueLabel?: string;
  /** ms per character. 0 = reveal instantly (tests / a11y reduced-motion). */
  typingSpeedMs?: number;
}

export function MascotDialog({
  portraitFile,
  text,
  onContinue,
  continueLabel = 'Tiếp',
  typingSpeedMs = 25,
}: MascotDialogProps) {
  const [revealed, setRevealed] = useState(() => (typingSpeedMs === 0 ? text.length : 0));

  useEffect(() => {
    // Typewriter pacing legitimately requires effect-driven setState on
    // text/speed change: reset counter then animate. ESLint's generic
    // "set-state-in-effect" rule flags this pattern — intentional here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typingSpeedMs === 0) {
      setRevealed(text.length);
      return;
    }
    setRevealed(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    const interval = window.setInterval(() => {
      setRevealed((r) => {
        if (r >= text.length) {
          window.clearInterval(interval);
          return r;
        }
        return r + 1;
      });
    }, typingSpeedMs);
    return () => window.clearInterval(interval);
  }, [text, typingSpeedMs]);

  const isFull = revealed >= text.length;

  const handleClick = () => {
    if (!isFull) {
      setRevealed(text.length);
      return;
    }
    onContinue();
  };

  return (
    <div
      role="dialog"
      aria-label="Sóc nói"
      className="mascot-dialog fixed inset-x-0 bottom-0 z-[90] flex items-end justify-center p-4"
    >
      <div className="mascot-panel flex w-full max-w-3xl items-end gap-4 rounded-2xl border-4 border-amber-300 bg-white/95 p-4 shadow-2xl">
        <img
          src={`/assets/mascot/${portraitFile}`}
          alt="Sóc"
          className="h-32 w-32 flex-shrink-0 object-contain"
        />
        <div className="flex flex-1 flex-col justify-between">
          <p
            data-testid="mascot-text"
            className="mascot-text min-h-[4rem] text-lg leading-relaxed text-slate-800"
          >
            {text.slice(0, revealed)}
          </p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleClick}
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white shadow hover:bg-amber-600"
            >
              {isFull ? continueLabel : 'Bỏ qua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
