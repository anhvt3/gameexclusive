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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';
import { BOSS_PENDING_FLAG, canAttemptBoss } from '@domain/BossQuest';
import { useGameAudio } from '@react/shell/useGameAudio';
import { QUESTS } from '@data/staticConfig/quests';
import { PLAYER_NAME_PLACEHOLDER } from '@/types/identity';
import { OnboardingFlow } from '@/react/onboarding/OnboardingFlow';
import { BattleStarsBadge } from '@/react/components/BattleStarsBadge';
import { DailyLoginCalendarOverlay } from '@/react/overlays/DailyLoginCalendarOverlay';
import { ShopOverlay } from '@/react/overlays/ShopOverlay';
import { PetBreedingOverlay } from '@/react/overlays/PetBreedingOverlay';

export function MainMenu() {
  const navigate = useNavigate();
  const hasProgress = useSaveState(
    (s) => s.flags[TUTORIAL_FLAG] === true || s.exp > 0 || s.level > 1
  );
  const lastBossAttempt = useSaveState((s) => s.last_boss_attempt_date);
  const setFlag = useSaveState((s) => s.setFlag);
  const canFightBoss = canAttemptBoss(lastBossAttempt);
  const anyQuestReady = useSaveState((s) =>
    QUESTS.some((q) => (s.questProgress[q.id] ?? 0) >= q.target && !s.claimedRewards.includes(q.id))
  );
  const playerName = useSaveState((s) => s.playerName);
  const tutorialCompleted = useSaveState((s) => s.flags[TUTORIAL_FLAG] === true);
  const isLoginClaimable = useSaveState((s) => s.isLoginClaimable(Date.now()));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoginCalendar, setShowLoginCalendar] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showBreeding, setShowBreeding] = useState(false);
  const displayName = playerName ?? PLAYER_NAME_PLACEHOLDER;
  const { playSfx } = useGameAudio();

  // Step 22.17 — primary-button audio handlers. Hover→ui_btn_hover,
  // click→ui_btn_click. Wrap navigation/handler to chain the SFX before
  // triggering the route change.
  const onHover = () => playSfx('ui_btn_hover');
  const click = (action: () => void) => () => {
    playSfx('ui_btn_click');
    action();
  };

  const handleBossClick = click(() => {
    setFlag(BOSS_PENDING_FLAG, true);
    navigate('/play');
  });

  const handlePlay = click(() => {
    if (!playerName || !tutorialCompleted) {
      setShowOnboarding(true);
      return;
    }
    navigate('/play');
  });

  return (
    <main
      aria-label="Menu chính"
      className="main-menu relative flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-amber-50 to-amber-100 px-4 py-8"
    >
      <header className="flex flex-col items-center gap-2 pt-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-900">Elemagica</h1>
        <p className="text-sm text-amber-700">Clevai Adventure</p>
        <div className="flex items-center gap-3">
          <p className="text-base font-semibold text-amber-800">Xin chào, {displayName}!</p>
          <BattleStarsBadge />
        </div>
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
          data-testid="main-menu-play"
          onMouseEnter={onHover}
          onClick={handlePlay}
          className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-bold text-white shadow-md transition hover:bg-orange-700"
        >
          Bắt đầu cuộc phiêu lưu
        </button>
        <button
          type="button"
          disabled={!hasProgress}
          onMouseEnter={onHover}
          onClick={click(() => navigate('/play'))}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 text-lg font-semibold text-white shadow transition enabled:hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
        >
          Tiếp tục
        </button>
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={handleBossClick}
          disabled={!canFightBoss}
          aria-label={canFightBoss ? 'Boss hôm nay' : 'Boss hôm nay — đã thử, quay lại ngày mai'}
          className="w-full rounded-xl bg-rose-600 px-6 py-3 text-base font-bold text-white shadow transition enabled:hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          {canFightBoss ? '⚔️ Boss hôm nay' : '⏳ Boss — mai quay lại'}
        </button>
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={click(() => navigate('/guild'))}
          className="w-full rounded-xl bg-stone-100 px-6 py-3 text-base font-semibold text-amber-800 shadow transition hover:bg-stone-200"
        >
          Bảng xếp hạng lớp
        </button>
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={click(() => navigate('/inventory'))}
          className="w-full rounded-xl bg-stone-100 px-6 py-3 text-base font-semibold text-amber-800 shadow transition hover:bg-stone-200"
        >
          Kho đồ
        </button>
        <button
          type="button"
          data-testid="main-menu-quests"
          onMouseEnter={onHover}
          onClick={click(() => navigate('/quests'))}
          className="relative w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
        >
          📜 Nhiệm vụ
          {anyQuestReady && (
            <span
              data-testid="main-menu-quests-sparkle"
              className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]"
            />
          )}
        </button>
        <button
          type="button"
          data-testid="main-menu-daily-rewards"
          onMouseEnter={onHover}
          onClick={click(() => setShowLoginCalendar(true))}
          className="relative w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
        >
          🎁 Quà Hằng Ngày
          {isLoginClaimable && (
            <span
              data-testid="main-menu-daily-rewards-sparkle"
              className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]"
            />
          )}
        </button>
        <button
          type="button"
          data-testid="main-menu-shop"
          onMouseEnter={onHover}
          onClick={click(() => setShowShop(true))}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
        >
          🛒 Cửa Hàng
        </button>
        <button
          type="button"
          data-testid="main-menu-breeding"
          onMouseEnter={onHover}
          onClick={click(() => setShowBreeding(true))}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
        >
          🥚 Lai Tạo
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="main-menu-settings"
            onMouseEnter={onHover}
            onClick={click(() => navigate('/settings'))}
            className="flex-1 rounded-lg bg-slate-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-slate-600"
          >
            ⚙️ Cài đặt
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

      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            navigate('/play');
          }}
        />
      )}
      <DailyLoginCalendarOverlay
        open={showLoginCalendar}
        onClose={() => setShowLoginCalendar(false)}
      />
      <ShopOverlay open={showShop} onClose={() => setShowShop(false)} />
      <PetBreedingOverlay open={showBreeding} onClose={() => setShowBreeding(false)} />
    </main>
  );
}
