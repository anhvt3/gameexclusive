/**
 * VictoryBanner — ISP v1.1 Step 22.16 / Appendix I §1.6.
 *
 * Spin-light victory banner. Subscribes to EXIT_COMBAT and reveals
 * for `combat_victory` (won=true) only — DEFEAT is silent here so
 * kids don't get a "celebration" feel from losing. Auto-dismisses
 * after 1.5s. SFX `combat_victory` is fired by appLifecycle's bus
 * listener already, no double-trigger needed.
 *
 * Mount once at the app shell; renders nothing while idle.
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@bus/EventBus';

const REVEAL_MS = 1500;

export const VICTORY_BANNER_REVEAL_MS = REVEAL_MS;

export function VictoryBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return eventBus.on('EXIT_COMBAT', ({ won }) => {
      if (!won) return;
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes victory-spin-light {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.55; }
        }
        @keyframes victory-banner-drop {
          0% { transform: translateY(-40px) scale(0.85); opacity: 0; }
          50% { transform: translateY(8px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .victory-spin-light {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 720px;
          height: 720px;
          background: conic-gradient(from 0deg, #ffd60a, transparent 30%, #ffd60a 50%, transparent 80%, #ffd60a);
          border-radius: 50%;
          filter: blur(8px);
          animation: victory-spin-light 3.6s linear infinite;
          pointer-events: none;
        }
        .victory-banner-drop {
          animation: victory-banner-drop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div
        role="alert"
        aria-label="Chiến thắng"
        data-testid="victory-banner"
        className="victory-banner-overlay pointer-events-none fixed inset-0 z-[120] flex items-center justify-center"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <div className="victory-spin-light" aria-hidden="true" />
          <img
            src="/assets/juice/victory_banner_transparent.png"
            alt="Chiến thắng"
            className="victory-banner-drop relative z-10 max-w-[80%] object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </>
  );
}
