import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Sprint F Task 13.
 *
 * Drives the Sprint F daily-rewards + loot-jar flow end-to-end:
 *   fresh save → MainMenu BattleStarsBadge=0 + sparkle on daily-rewards button
 *   → click → DailyLoginCalendarOverlay opens
 *   → claim → streak=1, anchor set, overlay auto-closes
 *   → 3 direct EXIT_COMBAT emits via bridge → LootJarOverlay appears
 *   → close → inventory grew by 3, jarCount reset
 *
 * Bridge pattern: __GAME__ is only attached on /play (where PhaserGame mounts).
 * Setup and combat-event injection happen on /play; MainMenu UI assertions
 * happen on / (navigated via React Router).
 *
 * Runs with --workers=1 to avoid state clobbering between tests.
 */

const PLAY_URL = 'http://localhost:5173/play';
const HOME_URL = 'http://localhost:5173/';

async function waitForBridge(page: Page) {
  await page.waitForFunction(() => Boolean((window as { __GAME__?: unknown }).__GAME__), null, {
    timeout: 30_000,
  });
}

test.describe('Sprint F — Daily Rewards', () => {
  test('login claim flow → loot jar flow → state mutations persist', async ({ page }) => {
    test.setTimeout(90_000);

    // ── Step 1: boot on /play to attach bridge, reset save, complete tutorial ──
    await page.goto(PLAY_URL);
    await waitForBridge(page);

    await page.evaluate(() => {
      (
        window as { __GAME__: { simulate: { resetSaveState: () => void } } }
      ).__GAME__.simulate.resetSaveState();
    });
    await page.evaluate(() => {
      (
        window as { __GAME__: { simulate: { completeTutorial: () => void } } }
      ).__GAME__.simulate.completeTutorial();
    });
    // Allow Zustand persist to flush to localStorage
    await page.waitForTimeout(100);

    // ── Step 2: navigate to / (MainMenu) — AppRouter engines keep running ──
    await page.goto(HOME_URL);

    // ── Step 3: BattleStarsBadge shows 0 ──
    const badge = page.getByTestId('battle-stars-badge');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toContainText('0');

    // ── Step 4: Daily rewards sparkle visible (claimable=true on fresh save) ──
    await expect(page.getByTestId('main-menu-daily-rewards-sparkle')).toBeVisible();

    // ── Step 5: Click button → DailyLoginCalendarOverlay opens ──
    await page.getByTestId('main-menu-daily-rewards').click();
    await expect(page.getByTestId('daily-login-overlay')).toBeVisible();

    // ── Step 6: Verify 7 day-cells rendered ──
    for (let day = 1; day <= 7; day++) {
      await expect(page.getByTestId(`day-cell-${day}`)).toBeVisible();
    }

    // ── Step 7: Click claim → streak=1, anchor set ──
    await page.getByTestId('claim-login-btn').click();

    // Streak and anchor assertable from localStorage (Zustand persist writes on setState)
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('game_ss3_save_v1');
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { state: { loginStreak?: number } };
        return (parsed.state.loginStreak ?? 0) >= 1;
      },
      null,
      { timeout: 5_000 }
    );

    const afterClaim = await page.evaluate(() => {
      const raw = localStorage.getItem('game_ss3_save_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        state: { loginStreak?: number; lastLoginAnchorUtc7?: number };
      };
      return {
        streak: parsed.state.loginStreak ?? 0,
        anchor: parsed.state.lastLoginAnchorUtc7 ?? 0,
      };
    });
    expect(afterClaim).not.toBeNull();
    expect(afterClaim!.streak).toBe(1);
    expect(afterClaim!.anchor).toBeGreaterThan(0);

    // Overlay auto-closes after 1.5s animation
    await expect(page.getByTestId('daily-login-overlay')).not.toBeVisible({ timeout: 5_000 });

    // Sparkle now gone (already claimed today)
    await expect(page.getByTestId('main-menu-daily-rewards-sparkle')).not.toBeVisible();

    // ── Step 8: Navigate to /play to get bridge for combat event injection ──
    await page.goto(PLAY_URL);
    await waitForBridge(page);

    // ── Step 9: Simulate 3 combat wins → DailyRewardEngine processes them ──
    // (DailyRewardEngine started in AppRouter, still running across navigation)
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        (
          window as { __GAME__: { simulate: { emitCombatExit: (won: boolean) => void } } }
        ).__GAME__.simulate.emitCombatExit(true);
      });
      await page.waitForTimeout(100);
    }

    // ── Step 10: LootJarOverlay visible (renders app-wide from AppRouter) ──
    await expect(page.getByTestId('loot-jar-overlay')).toBeVisible({ timeout: 5_000 });

    // ── Step 11: Battle stars accumulated (5 * level * 3 = 15 at level 1) ──
    const afterCombat = await page.evaluate(() => {
      const raw = localStorage.getItem('game_ss3_save_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        state: { battleStars?: number; lootJarBattlesSinceLast?: number };
      };
      return {
        stars: parsed.state.battleStars ?? 0,
        jarCount: parsed.state.lootJarBattlesSinceLast ?? 0,
      };
    });
    expect(afterCombat).not.toBeNull();
    expect(afterCombat!.stars).toBeGreaterThanOrEqual(15);

    // ── Step 12: Wait for jar animation, click close ──
    await page.waitForTimeout(2600);
    const closeBtn = page.getByTestId('loot-jar-close-btn');
    await expect(closeBtn).toBeEnabled();
    await closeBtn.click();

    // ── Step 13: Overlay closed, jar counter reset, inventory grew by 3 ──
    await expect(page.getByTestId('loot-jar-overlay')).not.toBeVisible();

    const final = await page.evaluate(() => {
      const raw = localStorage.getItem('game_ss3_save_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        state: { lootJarBattlesSinceLast?: number; inventory?: unknown[] };
      };
      return {
        jarCount: parsed.state.lootJarBattlesSinceLast ?? -1,
        invLen: (parsed.state.inventory ?? []).length,
      };
    });
    expect(final).not.toBeNull();
    expect(final!.jarCount).toBe(0);
    expect(final!.invLen).toBeGreaterThanOrEqual(3);
  });
});
