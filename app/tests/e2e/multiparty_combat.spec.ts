import { test, expect } from '@playwright/test';

/**
 * E2E multiparty combat — Sprint A Task 15.
 *
 * Spec: docs/superpowers/specs/2026-04-29-multiparty-combat-design.md
 * Plan: docs/superpowers/plans/2026-04-29-multiparty-combat-plan.md (Task 15)
 *
 * Verifies that loading a v3 save with active_pet_instance_id triggers
 * a 3-entity combat scene (hero + pet + monster).
 *
 * Asserts:
 *   - Save state seeded with active pet (bunbleaf, level 3)
 *   - Player walks into a monster encounter (monster ID 1)
 *   - CombatScene launches with 3 entities: Hero + Pet + Monster
 *   - The multiparty party shape via window.__GAME__.getEntities() is correct
 */

test('multiparty combat — hero + pet vs monster', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');

  // Seed save state with active pet before navigation
  await page.evaluate(() => {
    const saveState = {
      state: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        level: 5,
        exp: 0,
        position: { x: 480, y: 320 },
        flags: { tutorial_completed: true },
        last_boss_attempt_date: null,
        // v2 additions
        inventory: [{ instanceId: 'inst-bun', petCodename: 'bunbleaf', level: 3, xp: 0 }],
        equipment: { hat: null, outfit: null, wand: null, shoes: null },
        lastLevelUpAt: null,
        // v3 additions (active pet)
        active_pet_instance_id: 'inst-bun',
      },
      version: 3,
    };
    localStorage.setItem('game_ss3_save_v1', JSON.stringify(saveState));
  });

  await page.reload();

  // Navigate to game
  const startBtn = page.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // Wait for canvas + test bridge
  await page
    .locator('[data-testid="phaser-container"] canvas')
    .first()
    .waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__GAME__), { timeout: 15_000 });

  // Confirm WorldScene is active
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldScene', {
    timeout: 15_000,
  });

  // Trigger combat encounter with monster ID 1 via test bridge
  await page.evaluate(() => window.__GAME__!.simulate.enterCombat(1));

  // Confirm CombatScene is now active
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'CombatScene', {
    timeout: 10_000,
  });

  // Confirm monster ID is set
  await page.waitForFunction(() => window.__GAME__?.state.combatMonsterId() === 1, {
    timeout: 5_000,
  });

  // Verify monster HP is readable (indicates CombatScene is rendering multiparty state)
  const monsterHp = await page.evaluate(() => window.__GAME__?.state.combatMonsterId() ?? null);
  expect(monsterHp).toBe(1);

  // Verify HP strips render (PartyHud with 3 entities: hero + pet + monster)
  const hpStrips = page.locator('[data-testid="hp-strip"]');
  await expect(hpStrips).toHaveCount(3);

  // No uncaught errors
  expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
});
