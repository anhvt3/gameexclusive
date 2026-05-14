import { useEffect, useRef, useState } from 'react';
import type { BreedingSession } from '@/types/breeding';
import { rushCostFor } from '@/domain/BreedingRush';

interface Props {
  chamber: BreedingSession;
  battleStars: number;
  onRush: () => void;
  onReady: () => void;
}

function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function BreedingCountdown({ chamber, battleStars, onRush, onReady }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= chamber.hatchAt && !readyFiredRef.current) {
        readyFiredRef.current = true;
        onReady();
      }
    }, 1000);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [chamber.hatchAt, onReady]);

  const remainingMs = Math.max(0, chamber.hatchAt - now);
  const fullDurationMs = chamber.hatchAt - chamber.startedAt;
  const elapsedPct =
    fullDurationMs > 0
      ? Math.min(100, Math.round(((fullDurationMs - remainingMs) / fullDurationMs) * 100))
      : 100;

  const rushCost = rushCostFor(chamber.offspringSpec.rarity);
  const alreadyRushed = chamber.rushedAt !== null;
  const insufficient = battleStars < rushCost;
  const rushDisabled = alreadyRushed || insufficient;

  return (
    <div data-testid="breeding-countdown" className="flex flex-col items-center gap-3 p-4">
      <span data-testid="breeding-countdown-text" className="font-mono text-2xl text-amber-900">
        {formatMMSS(remainingMs)}
      </span>
      <div className="h-2 w-48 rounded bg-amber-100">
        <div
          data-testid="breeding-countdown-bar"
          className="h-full rounded bg-amber-500 transition-all"
          style={{ width: `${elapsedPct}%` }}
        />
      </div>
      <button
        data-testid="breeding-rush-btn"
        onClick={onRush}
        disabled={rushDisabled}
        className="rounded bg-amber-600 px-3 py-1 text-sm font-bold text-white disabled:bg-stone-300"
      >
        Rush ({rushCost})
      </button>
    </div>
  );
}
