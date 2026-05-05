import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Sprint D Task 13.
 *
 * Drives the full Sprint D quest loop:
 *   reset cycle anchors → 3 combat wins via one-shot bridge methods
 *   → questProgress['daily-combat-3'] === 3 → /quests → click claim
 *   → RewardChestOverlay shows "Đóng" → click → claimedRewards updated
 *   + inventory grew.
 *
 * Per Sprint B/C precedent, scene transitions are flaky in headless
 * Chromium parallelism, so this spec relies on the test bridge's
 * direct one-shot helpers (enterCombat / setMonsterHp / clickSpell /
 * submitQuiz) and runs with --workers=1.
 */

test.use({ baseURL: 'http://localhost:5173' });

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__GAME__?.__phaser), { timeout: 15_000 });
}

test('sprint D: 3 combat wins → daily-combat-3 ready → claim → item in inventory', async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.goto('/');

  // Skip tutorial — seed Zustand's persisted save with tutorial_completed
  // (mirrors sprint_c_pet_rescue.spec.ts).
  await page.evaluate(() => {
    const next = {
      state: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        level: 1,
        exp: 0,
        position: { x: 0, y: 0 },
        flags: { tutorial_completed: true },
      },
      version: 1,
    };
    localStorage.setItem('game_ss3_save_v1', JSON.stringify(next));
  });
  await page.reload();

  await page.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i }).click();
  await page
    .locator('[data-testid="phaser-container"] canvas')
    .first()
    .waitFor({ timeout: 15_000 });
  await waitForGame(page);

  // Reset quest cycle anchors to "now" so the daily/weekly reset doesn't
  // fire mid-test. setQuestCycleAnchors dispatches via dynamic ESM import;
  // allow the microtask to flush before we read state.
  await page.evaluate(() => window.__GAME__!.simulate.setQuestCycleAnchors(Date.now()));
  await page.waitForTimeout(100);

  // Drive 3 combat wins via the one-shot bridge methods.
  for (let i = 0; i < 3; i++) {
    // Make sure WorldScene is the active scene before launching CombatScene.
    await page.evaluate(() => {
      const g = window.__GAME__!;
      g.simulate.setLegacyWorldFlag(true);
      const sm = g.__phaser.scene;
      const world = sm.getScene('WorldScene');
      if (!world || !world.scene.isActive()) {
        for (const s of sm.getScenes(true)) {
          if (s.scene.key !== 'WorldScene') sm.stop(s.scene.key);
        }
        sm.start('WorldScene');
      }
    });
    await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldScene', {
      timeout: 10_000,
    });

    await page.evaluate(() => window.__GAME__!.simulate.enterCombat(1));
    await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'PLAYER_TURN', {
      timeout: 10_000,
    });
    await page.evaluate(() => window.__GAME__!.simulate.setMonsterHp(1));
    await page.evaluate(() => window.__GAME__!.simulate.clickSpell('fire_blast'));
    await page.waitForFunction(() => window.__GAME__?.state.activeLoId() != null, {
      timeout: 5_000,
    });
    await page.evaluate(() => window.__GAME__!.simulate.submitQuiz(true));
    // Allow EXIT_COMBAT + QUEST_PROGRESS to settle.
    await page.waitForFunction(
      (n) => (window.__GAME__!.getSaveState().questProgress['daily-combat-3'] ?? 0) >= n,
      i + 1,
      { timeout: 5_000 }
    );
  }

  // Verify quest progress reached 3.
  const progress = await page.evaluate(
    () => window.__GAME__!.getSaveState().questProgress['daily-combat-3']
  );
  expect(progress).toBe(3);

  // Capture inventory length before navigation (the Phaser bridge `__GAME__`
  // is only attached on the /play route — on /quests we fall back to
  // reading the persisted Zustand store from localStorage).
  const beforeInv = await page.evaluate(() => window.__GAME__!.getSaveState().inventory.length);

  // Navigate to /quests via direct URL change.
  await page.goto('/quests');
  await page.waitForSelector('[data-testid="quests-tier-daily"]');

  await page.click('[data-testid="quest-claim-daily-combat-3"]');

  // RewardChestOverlay opens with "Đóng" button label.
  const btn = page.locator('[data-testid="chest-overlay-back-to-world-map"]');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveText('Đóng');
  await btn.click();

  // Verify quest claimed + inventory grew by 1 — read from the persisted
  // localStorage save (Zustand persist writes on every setState).
  const after = await page.evaluate(() => {
    const raw = localStorage.getItem('game_ss3_save_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state: { claimedRewards?: string[]; inventory?: unknown[] };
    };
    return {
      claimedRewards: parsed.state.claimedRewards ?? [],
      inventoryLen: (parsed.state.inventory ?? []).length,
    };
  });
  expect(after).not.toBeNull();
  expect(after!.claimedRewards).toContain('daily-combat-3');
  expect(after!.inventoryLen).toBe(beforeInv + 1);
});
