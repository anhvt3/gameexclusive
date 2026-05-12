import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'shake' | 'hatch';

interface Props {
  onHatched: () => void;
}

const SHAKE_AT_MS = 500;
const HATCH_AT_MS = 1500;

export function EggHatchAnim({ onHatched }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
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
  }, [onHatched]);

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
