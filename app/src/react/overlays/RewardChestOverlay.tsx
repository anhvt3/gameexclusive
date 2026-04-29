/**
 * RewardChestOverlay — ISP v1.1 Step 22.14 / Appendix I §1.3.
 *
 * Reward animation for LEVEL_UP. Subscribes to the bus, queues incoming
 * grants so multi-level cascades animate sequentially, and walks each
 * grant through three short phases: closed → wobble → open. The
 * granted item icon (when present) flies up from the chest as it opens.
 *
 * Audio:
 *   - `world_level_up` already fires on LEVEL_UP via appLifecycle —
 *     don't double-fire here.
 *   - `world_chest_open` fires when this overlay flips into the 'open'
 *     phase (or when the user presses Skip while the chest is still
 *     closed/wobbling).
 *
 * Mounted once at the app shell; renders nothing while idle.
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@bus/EventBus';
import { findItemDef } from '@data/staticConfig/items';
import { useGameAudio } from '@react/shell/useGameAudio';

type Phase = 'idle' | 'closed' | 'wobble' | 'open';

interface Grant {
  newLevel: number;
  grantedItemId: string | null;
}

const PHASE_MS: Record<Exclude<Phase, 'idle'>, number> = {
  closed: 300,
  wobble: 500,
  open: 1200,
};

export const REWARD_CHEST_PHASE_MS = PHASE_MS;

export function RewardChestOverlay() {
  const { playSfx } = useGameAudio();
  const [queue, setQueue] = useState<Grant[]>([]);
  const [active, setActive] = useState<Grant | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  // Subscribe to LEVEL_UP — push to queue.
  useEffect(() => {
    const off = eventBus.on('LEVEL_UP', (g) => {
      setQueue((prev) => [...prev, g]);
    });
    return off;
  }, []);

  // Drain the queue when idle. Effect-driven setState is required here:
  // the queue grows asynchronously via the bus listener, and we react by
  // promoting the next grant to active. ESLint's generic
  // "set-state-in-effect" rule flags this — intentional pattern.
  useEffect(() => {
    if (phase !== 'idle') return;
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    /* eslint-disable react-hooks/set-state-in-effect */
    setQueue(rest);
    setActive(next!);
    setPhase('closed');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [phase, queue]);

  // Phase timeline.
  useEffect(() => {
    if (phase === 'idle') return;
    let timer: number | null = null;
    if (phase === 'closed') {
      timer = window.setTimeout(() => setPhase('wobble'), PHASE_MS.closed);
    } else if (phase === 'wobble') {
      timer = window.setTimeout(() => {
        playSfx('world_chest_open');
        setPhase('open');
      }, PHASE_MS.wobble);
    } else if (phase === 'open') {
      timer = window.setTimeout(() => {
        setPhase('idle');
        setActive(null);
      }, PHASE_MS.open);
    }
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [phase, playSfx]);

  const handleSkip = () => {
    if (phase === 'idle') return;
    // If user skips before the chest naturally opens, still play the open SFX
    // so the audio cue is consistent regardless of pacing choice.
    if (phase === 'closed' || phase === 'wobble') {
      playSfx('world_chest_open');
    }
    setPhase('idle');
    setActive(null);
  };

  if (phase === 'idle' || !active) return null;

  const itemDef = active.grantedItemId ? findItemDef(active.grantedItemId) : null;
  const itemName = itemDef?.displayNameVi ?? null;

  return (
    <>
      <style>{`
        @keyframes chest-wobble {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(6deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes chest-burst {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); filter: brightness(1.4); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes item-float {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-72px); opacity: 0; }
        }
        .chest-wobble { animation: chest-wobble 500ms ease-in-out infinite; }
        .chest-burst  { animation: chest-burst 800ms ease-out forwards; }
        .item-float   { animation: item-float 1100ms ease-out forwards; }
      `}</style>
      <div
        role="dialog"
        aria-label="Phần thưởng lên cấp"
        data-phase={phase}
        className="reward-chest-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-4 border-amber-300 bg-amber-50 p-8 shadow-2xl">
          <h2 className="text-2xl font-extrabold text-amber-900">🎉 Lên cấp {active.newLevel}!</h2>

          <div className="relative h-40 w-40">
            <img
              src="/assets/juice/treasure_chest_transparent.png"
              alt="Rương phần thưởng"
              data-testid="chest-sprite"
              className={[
                'h-full w-full object-contain',
                phase === 'wobble' ? 'chest-wobble' : '',
                phase === 'open' ? 'chest-burst' : '',
              ].join(' ')}
            />
            {phase === 'open' && itemDef && (
              <img
                src={itemDef.iconPath}
                alt={itemDef.displayNameVi}
                data-testid="chest-item-icon"
                className="item-float pointer-events-none absolute inset-0 m-auto h-20 w-20 object-contain"
              />
            )}
          </div>

          <p className="text-center text-base font-semibold text-amber-800">
            {itemName ? (
              <>
                Bạn nhận: <span className="font-bold text-orange-700">{itemName}</span>
              </>
            ) : (
              'Bạn lên cấp! Tiếp tục cuộc phiêu lưu nhé.'
            )}
          </p>

          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg bg-amber-500 px-6 py-2 font-bold text-white shadow hover:bg-amber-600"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </>
  );
}
