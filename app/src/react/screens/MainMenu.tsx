/**
 * MainMenu — ISP v1.1 Step 21 / WF1 (Appendix B).
 *
 * Landing screen: Clevai logo + Sóc mascot portrait + two primary CTAs
 *   - "Bắt đầu cuộc phiêu lưu" → /play (always enabled)
 *   - "Tiếp tục"               → /play (disabled until tutorial_completed)
 *
 * Phase 1: Settings / Giới thiệu buttons are rendered as placeholders
 * but disabled (deferred — ISP says "Settings defer").
 */

import { useNavigate } from 'react-router-dom';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';

export function MainMenu() {
  const navigate = useNavigate();
  const hasProgress = useSaveState(
    (s) => s.flags[TUTORIAL_FLAG] === true || s.exp > 0 || s.level > 1
  );

  return (
    <main
      aria-label="Menu chính"
      className="main-menu relative flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-amber-50 to-amber-100 px-4 py-8"
    >
      <header className="flex flex-col items-center gap-2 pt-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-900">Elemagica</h1>
        <p className="text-sm text-amber-700">Clevai Adventure</p>
      </header>

      <section className="flex flex-col items-center gap-4">
        <img
          src="/assets/mascot/soc_guide_greet.png"
          alt="Sóc Clevai"
          className="h-48 w-48 object-contain drop-shadow-xl"
        />
        <p className="max-w-md text-center text-amber-800">
          Chào bạn! Cùng Sóc khám phá thế giới Elemagica nhé.
        </p>
      </section>

      <section className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/play')}
          className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-bold text-white shadow-md transition hover:bg-orange-700"
        >
          Bắt đầu cuộc phiêu lưu
        </button>
        <button
          type="button"
          disabled={!hasProgress}
          onClick={() => navigate('/play')}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 text-lg font-semibold text-white shadow transition enabled:hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
        >
          Tiếp tục
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-500"
            aria-label="Cài đặt (sắp có)"
          >
            Cài đặt
          </button>
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-500"
            aria-label="Giới thiệu (sắp có)"
          >
            Giới thiệu
          </button>
        </div>
      </section>

      <footer className="text-xs text-amber-700">v1.0 · © Clevai 2026</footer>
    </main>
  );
}
