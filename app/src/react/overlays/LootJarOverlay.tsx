/**
 * LootJarOverlay — Sprint F §4.9.3
 *
 * Self-mounting overlay that listens for LOOT_JAR_READY and plays
 * a 3-frame animation:
 *   - 0–1000ms  : idle 🏺
 *   - 1000–1500ms: shake 🏺 (CSS keyframe jitter)
 *   - 1500ms+   : pop 💥, items minted via claimLootJar, "Đóng" disabled
 *   - 2500ms+   : "Đóng" enabled — student dismisses overlay
 *
 * Mounted once at the app shell; renders nothing while idle.
 */

import { useEffect, useRef, useState } from 'react';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import type { ItemDef } from '@/data/staticConfig/items';

const PHASE_IDLE_MS = 1000;
const PHASE_SHAKE_MS = 500;
const PHASE_REVEAL_DELAY_MS = 1000;
/** Total ms until close button is enabled */
const CLOSE_ENABLE_TOTAL_MS = PHASE_IDLE_MS + PHASE_SHAKE_MS + PHASE_REVEAL_DELAY_MS; // 2500ms
/** ms until items are minted */
const MINT_AT_MS = PHASE_IDLE_MS + PHASE_SHAKE_MS; // 1500ms

type Phase = 'idle' | 'shake' | 'pop';

/**
 * Sprint F — Loot Jar reveal overlay.
 */
export function LootJarOverlay() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<ItemDef[]>([]);
  const [canClose, setCanClose] = useState(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    const off = eventBus.on('LOOT_JAR_READY', () => {
      // Idempotency guard: if animation is already pending (timers in flight),
      // ignore duplicate emits to prevent double-claim + state thrash.
      // Stale-closure safe because we check the ref, not the `visible` state.
      if (timersRef.current.length > 0) return;
      setVisible(true);
      setPhase('idle');
      setItems([]);
      setCanClose(false);

      timersRef.current.push(
        setTimeout(() => setPhase('shake'), PHASE_IDLE_MS),
        setTimeout(() => {
          setPhase('pop');
          // Mint items at t=1500ms
          const heroLevel = useSaveState.getState().level;
          const minted = useSaveState.getState().claimLootJar(heroLevel);
          if (minted) setItems(minted);
        }, MINT_AT_MS),
        setTimeout(() => setCanClose(true), CLOSE_ENABLE_TOTAL_MS)
      );
    });
    return () => {
      off();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const handleClose = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setVisible(false);
    setPhase('idle');
    setItems([]);
    setCanClose(false);
  };

  if (!visible) return null;

  const jarGlyph = phase === 'pop' ? '💥' : '🏺';
  const shakeClass = phase === 'shake' ? 'animate-pulse' : '';

  return (
    <>
      <style>{`
        @keyframes jar-shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(6px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .jar-shake { animation: jar-shake 400ms ease-in-out infinite; }
      `}</style>
      <div
        data-testid="loot-jar-overlay"
        className="fixed inset-0 z-45 flex items-center justify-center bg-black/60"
      >
        <div className="rounded-lg bg-amber-50 p-8 shadow-2xl ring-2 ring-amber-300">
          <h2 className="mb-4 text-center text-xl font-bold text-amber-900">Bình Báu</h2>

          <div
            className={`mb-4 text-center text-7xl ${phase === 'shake' ? 'jar-shake' : shakeClass}`}
            aria-hidden="true"
          >
            {jarGlyph}
          </div>

          {phase === 'pop' && items.length > 0 && (
            <div data-testid="loot-jar-items" className="mb-4 flex justify-center gap-3 text-3xl">
              {items.map((it, idx) => (
                <span key={idx} title={it.displayNameVi}>
                  🎁
                </span>
              ))}
            </div>
          )}

          <button
            data-testid="loot-jar-close-btn"
            onClick={handleClose}
            disabled={!canClose}
            className="w-full rounded bg-amber-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
