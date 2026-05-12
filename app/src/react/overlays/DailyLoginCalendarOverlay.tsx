import { useEffect, useRef, useState } from 'react';
import { useSaveState } from '@/persistence/SaveStateStore';
import { evaluateLoginClaimable } from '@/domain/LoginCalendar';
import { streakFlameVariant } from '@/domain/StreakMultiplier';
import { performLoginClaim } from '@/domain/performLoginClaim';
import { LOGIN_CALENDAR_TEMPLATE } from '@/data/staticConfig/loginCalendar';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FLAME_EMOJI: Record<'small' | 'medium' | 'large', string> = {
  small: '🔥',
  medium: '🔥🔥',
  large: '🔥🔥🔥',
};

const CLOSE_DELAY_MS = 1500;

/**
 * Sprint F — Daily Login Calendar Overlay (Task 9).
 *
 * Displays the 7-day reward cycle and a claim button. Calls
 * `performLoginClaim` on click which orchestrates SaveState v8 mutations
 * and emits LOGIN_CLAIMED. Closes after CLOSE_DELAY_MS on success.
 *
 * Lives in react/overlays/ — no Phaser imports. Uses Tailwind CSS.
 */
export function DailyLoginCalendarOverlay({ open, onClose }: Props) {
  const lastLoginAnchorUtc7 = useSaveState((s) => s.lastLoginAnchorUtc7);
  const loginStreak = useSaveState((s) => s.loginStreak);
  const [now] = useState(() => Date.now());

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const info = evaluateLoginClaimable(lastLoginAnchorUtc7, loginStreak, now);
  const flame = streakFlameVariant(Math.max(loginStreak, info.newStreak));

  const handleClaim = () => {
    const result = performLoginClaim(now);
    if (result) {
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, CLOSE_DELAY_MS);
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="daily-login-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-amber-50 p-6 shadow-2xl ring-2 ring-amber-200">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-amber-900">Quà Hằng Ngày</h2>
          <span data-testid="streak-display" className="text-sm text-amber-700">
            {flame ? `${FLAME_EMOJI[flame]} ` : ''}Streak {loginStreak} ngày
          </span>
        </header>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {LOGIN_CALENDAR_TEMPLATE.map((reward, idx) => {
            const day = idx + 1;
            const isToday = info.claimable && info.todayDayOfCycle === day;
            // After claiming, todayDayOfCycle shows which day was just claimed
            const cyclePos = ((loginStreak - 1) % 7) + 1;
            const isPastCycle = !info.claimable && day <= cyclePos;
            const stateClass = isToday
              ? 'bg-amber-300 ring-2 ring-amber-500'
              : isPastCycle
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-stone-100 text-stone-500';
            return (
              <div
                key={day}
                data-testid={`day-cell-${day}`}
                className={`flex h-20 w-20 flex-col items-center justify-center rounded ${stateClass}`}
              >
                <span className="text-xs font-bold">Ngày {day}</span>
                <span aria-hidden="true" className="text-2xl">
                  {reward.kind === 'stars' ? '⭐' : reward.kind === 'mixed' ? '🏆' : '🎁'}
                </span>
              </div>
            );
          })}
        </div>

        <button
          data-testid="claim-login-btn"
          onClick={handleClaim}
          disabled={!info.claimable}
          className="w-full rounded bg-amber-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {info.claimable ? `Nhận Quà Ngày ${info.todayDayOfCycle}` : 'Đã nhận hôm nay'}
        </button>
      </div>
    </div>
  );
}
