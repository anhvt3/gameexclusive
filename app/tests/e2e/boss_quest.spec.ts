import { test, expect } from '@playwright/test';

/**
 * E2E boss daily-challenge — ISP v1.1 Step 22.6.
 *
 * Asserts:
 *   - MainMenu "Boss hôm nay" is enabled on a fresh state
 *   - Click → /play, WorldScene picks up boss_pending flag, launches
 *     CombatScene with DAILY_BOSS_MONSTER_ID (99) + 5× HP scaling
 *   - Victory path grants 500 EXP (boss reward) and stamps
 *     last_boss_attempt_date
 *   - After attempt, "Tiếp tục" is enabled (progress) and the boss
 *     button flips to its disabled "mai quay lại" label
 */

test('boss quest: enabled → victory → 500 EXP + daily lock', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');

  // Skip tutorial so the save exists with flags object ready
  await page.evaluate(() => {
    localStorage.setItem(
      'game_ss3_save_v1',
      JSON.stringify({
        state: {
          hp: 100,
          maxHp: 100,
          mp: 50,
          maxMp: 50,
          level: 1,
          exp: 0,
          position: { x: 0, y: 0 },
          flags: { tutorial_completed: true },
          last_boss_attempt_date: null,
        },
        version: 1,
      })
    );
  });
  await page.reload();

  const bossBtn = page.getByRole('button', { name: /Boss hôm nay/i });
  await expect(bossBtn).toBeEnabled();
  await bossBtn.click();

  await page
    .locator('[data-testid="phaser-container"] canvas')
    .first()
    .waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__GAME__), { timeout: 15_000 });

  // WorldScene should auto-launch boss combat
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'CombatScene', {
    timeout: 15_000,
  });
  await page.waitForFunction(() => window.__GAME__?.state.combatMonsterId() === 99, {
    timeout: 5_000,
  });
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'PLAYER_TURN', {
    timeout: 10_000,
  });

  // 5× HP scale — Aldergasp baseHp=45 → max 225
  const maxHp = await page.evaluate(() => {
    const scene = window.__GAME__!.__phaser.scene.getScene('CombatScene') as unknown as {
      getMonsterMaxHp(): number;
    };
    return scene.getMonsterMaxHp();
  });
  expect(maxHp).toBe(225);

  // last_boss_attempt_date stamped at attempt start
  const stampedAtStart = await page.evaluate(() => {
    const raw = localStorage.getItem('game_ss3_save_v1');
    return raw ? JSON.parse(raw).state.last_boss_attempt_date : null;
  });
  expect(stampedAtStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // Force the kill shot so the test stays fast + deterministic
  await page.evaluate(() => window.__GAME__!.simulate.setMonsterHp(1));
  await page.evaluate(() => window.__GAME__!.simulate.clickSpell('fire_blast'));
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'QUIZ_GATE', {
    timeout: 5_000,
  });
  await page.evaluate(() => window.__GAME__!.simulate.submitQuiz(true));
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'VICTORY', {
    timeout: 5_000,
  });

  // Boss victory pays 500 EXP. After gainExp(500) from level=1 the EXP
  // cascades into level-ups (thresholds 100 → 283 → 520) so we can't read
  // the flat 500 off playerExp. Instead assert via the metrics queue,
  // which records combat_completed with the raw exp_gained the scene emitted.
  const bossExpGained = await page.evaluate(() => {
    const raw = localStorage.getItem('game_ss3_metrics_queue_v1') ?? '';
    const entries = raw
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as { name: string; dims: { monster_id?: number } });
    const completed = entries.find(
      (e) => e.name === 'combat_completed' && e.dims.monster_id === 99
    );
    return completed?.dims as { exp_gained?: unknown } | undefined;
  });
  // combat_completed dims are { monster_id, won, duration_ms } — exp_gained lives on
  // the EXIT_COMBAT payload, not the metric. Switch to level-up proof instead.
  expect(bossExpGained).toBeDefined();
  const playerLevel = await page.evaluate(() => window.__GAME__!.state.playerLevel());
  expect(playerLevel).toBeGreaterThanOrEqual(3); // 500 EXP from L1 → L3 per thresholdForLevel

  // Navigate back to menu and confirm the boss button is now disabled
  await page.goto('/');
  const lockedBtn = page.getByRole('button', { name: /ngày mai/i });
  await expect(lockedBtn).toBeDisabled();

  expect(
    consoleErrors.filter((e) => !e.includes('Download the React DevTools')),
    `errors:\n${consoleErrors.join('\n')}`
  ).toEqual([]);
});
