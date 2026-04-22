import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * E2E full flow — ISP v1.1 Step 22.
 *
 * Drives the game via window.__GAME__ (exposed by PhaserGame in DEV),
 * avoiding pixel-matching of the Phaser canvas.
 *
 * Flow:
 *   Menu → skip tutorial → /play
 *   → ENTER_COMBAT(monster=1, Embershed)
 *   → force monster HP low, clickSpell + submitQuiz(correct) × 1
 *   → VICTORY → EXIT_COMBAT → back on WorldScene
 *
 * Exit criteria per ISP: test completes < 90s, no console errors.
 */

test('full flow: Menu → Play → Combat → Victory → Return', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', onConsole);
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // 1. Menu visible
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i })).toBeVisible();

  // 2. Skip tutorial — seed Zustand's persisted save with tutorial_completed.
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

  // 3. Enter /play
  await page.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i }).click();
  await page
    .locator('[data-testid="phaser-container"] canvas')
    .first()
    .waitFor({ timeout: 15_000 });

  // 4. Wait for WorldScene active and test bridge attached
  await page.waitForFunction(() => Boolean(window.__GAME__), { timeout: 15_000 });
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldScene', {
    timeout: 15_000,
  });

  // 5. Force combat with Embershed (id=1)
  await page.evaluate(() => window.__GAME__!.simulate.enterCombat(1));
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'CombatScene', {
    timeout: 10_000,
  });
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'PLAYER_TURN', {
    timeout: 10_000,
  });

  // 6. Seed the kill shot: drop monster HP so next correct spell wins
  await page.evaluate(() => window.__GAME__!.simulate.setMonsterHp(1));

  // 7. Click spell → quiz gate
  await page.evaluate(() => window.__GAME__!.simulate.clickSpell('fire_blast'));
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'QUIZ_GATE', {
    timeout: 5_000,
  });
  await page.waitForFunction(() => window.__GAME__?.state.activeLoId() != null, {
    timeout: 5_000,
  });

  // 8. Submit correct answer → VICTORY path → EXIT_COMBAT → scene.stop()
  await page.evaluate(() => window.__GAME__!.simulate.submitQuiz(true));
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'VICTORY', {
    timeout: 5_000,
  });

  // 9. World resumed, monster cleared, EXP granted
  await page.waitForFunction(() => window.__GAME__?.state.combatMonsterId() === null, {
    timeout: 5_000,
  });
  const exp = await page.evaluate(() => window.__GAME__!.state.playerExp());
  expect(exp).toBeGreaterThan(0); // Embershed baseHp=40 exp

  // 10. No console / page errors throughout
  expect(pageErrors, `pageerror:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(
    consoleErrors.filter((e) => !e.includes('Download the React DevTools')),
    `console.error:\n${consoleErrors.join('\n')}`
  ).toEqual([]);

  page.off('console', onConsole);
});
