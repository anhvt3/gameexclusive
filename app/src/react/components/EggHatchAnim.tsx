import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'shake' | 'hatch';
type Mode = 'incubating' | 'hatching';

interface Props {
  onHatched: () => void;
  mode?: Mode; // default 'hatching' for backward compat
}

const SHAKE_AT_MS = 500;
const HATCH_AT_MS = 1500;

export function EggHatchAnim({ onHatched, mode = 'hatching' }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (mode === 'incubating') {
      return; // Static egg only — no animation sequence.
    }
    timersRef.current.push(
      setTimeout(() => setPhase('shake'), SHAKE_AT_MS),
      setTimeout(() => {
        setPhase('hatch');
        onHatched();
      }, HATCH_AT_MS)
    );
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [mode, onHatched]);

  const glyph = phase === 'hatch' ? '🌟' : '🥚';
  const shakeClass = phase === 'shake' ? 'animate-pulse' : '';

  return (
    <div
      data-testid="egg-anim"
      data-phase={phase}
      className={`text-6xl ${shakeClass}`}
      aria-hidden="true"
    >
      {glyph}
    </div>
  );
}
