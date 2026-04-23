import { test, expect, type Page } from '@playwright/test';

/**
 * E2E equipment stat modifiers — ISP v1.1 Step 22.10.
 *
 * Baseline vs equipped over 5 Fire spells each; equipped average must
 * exceed baseline average. LO pick is random inside the scene so we
 * sample rather than pin — 5 hits is enough signal for a +10% bump.
 */

async function seedSave(page: Page, equipped: boolean): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ equipped }) => {
      // Stack Fire wand (+10%) + Fire robe (+3% + 8 maxHp). Gap vs baseline
      // is 13% on Fire damage, which clears integer-rounding ties across
      // parallel test runs.
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
            inventory: [
              { instanceId: 'i-fire-wand', itemId: 'wand-fire-01', acquiredAt: 1 },
              { instanceId: 'i-fire-robe', itemId: 'outfit-fire-01', acquiredAt: 2 },
            ],
            equipment: {
              hat: null,
              outfit: equipped ? 'i-fire-robe' : null,
              wand: equipped ? 'i-fire-wand' : null,
              shoes: null,
            },
            lastLevelUpAt: null,
          },
          version: 2,
        })
      );
    },
    { equipped }
  );
  await page.reload();
  await page.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i }).click();
  await page
    .locator('[data-testid="phaser-container"] canvas')
    .first()
    .waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__GAME__), { timeout: 15_000 });
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldScene', {
    timeout: 15_000,
  });
}

async function sumFireDamage(page: Page, samples: number): Promise<number> {
  // Accumulate damage across `samples` consecutive Fire spells in a single
  // combat; retreat to World and re-enter if combat resolves mid-run.
  let total = 0;
  for (let i = 0; i < samples; i++) {
    // Enter a fresh combat each sample so monster HP is always full.
    await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldScene', {
      timeout: 10_000,
    });
    await page.evaluate(() => window.__GAME__!.simulate.enterCombat(1));
    await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'PLAYER_TURN', {
      timeout: 10_000,
    });
    const before = await page.evaluate(() => {
      const scene = window.__GAME__!.__phaser.scene.getScene('CombatScene') as unknown as {
        getMonsterHp(): number;
      };
      return scene.getMonsterHp();
    });
    await page.evaluate(() => window.__GAME__!.simulate.clickSpell('fire_blast'));
    await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'QUIZ_GATE', {
      timeout: 5_000,
    });
    await page.waitForFunction(() => window.__GAME__?.state.activeLoId() != null, {
      timeout: 5_000,
    });
    const after = await page.evaluate(() => {
      // Submit correct answer, then read monster HP immediately —
      // handleQuizResult runs synchronously.
      window.__GAME__!.simulate.submitQuiz(true);
      const scene = window.__GAME__!.__phaser.scene.getScene('CombatScene') as unknown as {
        getMonsterHp(): number;
      };
      return scene.getMonsterHp();
    });
    total += before - after;
    // Force-exit combat cleanly so next sample starts from WorldScene.
    await page.evaluate(() => {
      const scene = window.__GAME__!.__phaser.scene.getScene('CombatScene') as unknown as {
        __setMonsterHp(hp: number): void;
      };
      scene.__setMonsterHp(0);
    });
    // Trigger victory by clicking again then submitting — or just emit EXIT directly.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('force-exit'));
      // Emit EXIT_COMBAT to resume WorldScene.
      const phaser = window.__GAME__!.__phaser;
      phaser.scene.getScene('CombatScene')?.scene.stop();
      const world = phaser.scene.getScene('WorldScene');
      if (world) world.scene.resume();
    });
  }
  return total;
}

test('wand-fire-01 equipped → more total Fire damage over 5 samples than baseline', async ({
  page,
}) => {
  await seedSave(page, true);
  const equippedTotal = await sumFireDamage(page, 5);

  await seedSave(page, false);
  const baselineTotal = await sumFireDamage(page, 5);

  // +10% → equipped average ≈ 1.10× baseline. Expect strict > on the totals.
  expect(equippedTotal).toBeGreaterThan(baselineTotal);
});
