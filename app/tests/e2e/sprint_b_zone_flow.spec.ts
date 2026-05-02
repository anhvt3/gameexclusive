import { test, expect, type Page } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__GAME__?.__phaser), { timeout: 15_000 });
}

async function killShotOnce(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'PLAYER_TURN', {
    timeout: 10_000,
  });
  await page.evaluate(() => window.__GAME__!.simulate.setMonsterHp(1));
  await page.evaluate(() => window.__GAME__!.simulate.clickSpell('fire_blast'));
  await page.waitForFunction(() => window.__GAME__?.state.combatState() === 'QUIZ_GATE', {
    timeout: 5_000,
  });
  await page.waitForFunction(() => window.__GAME__?.state.activeLoId() != null, {
    timeout: 5_000,
  });
  await page.evaluate(() => window.__GAME__!.simulate.submitQuiz(true));
}

test('sprint B: forest island full traverse', async ({ page }) => {
  await page.goto('/');

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

  // 1. World Map → pick Forest → ZoneScene entrance
  await page.evaluate(() => window.__GAME__!.simulate.startWorldMap());
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldMapScene', {
    timeout: 10_000,
  });
  await page.evaluate(() => window.__GAME__!.simulate.clickIsland('forest'));
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'ZoneScene', {
    timeout: 10_000,
  });

  // 2. Direct start ZoneScene in 'path' mode (bypass entrance→path transition)
  await page.evaluate(() => window.__GAME__!.simulate.startZonePath('forest-island'));
  await page.waitForFunction(
    () => {
      const s = window.__GAME__?.__phaser.scene.getScene('ZoneScene') as any;
      return s && s.getScreen?.() === 'path' && s.sys?.isActive?.();
    },
    { timeout: 10_000 }
  );

  // 3. Walk path safely
  await page.evaluate(async () => {
    await window.__GAME__!.simulate.walkPathSafe();
  });

  // 4. Direct start BossHallScene (bypass path→boss transition)
  await page.evaluate(() => window.__GAME__!.simulate.startBossHall('forest-island'));
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'BossHallScene', {
    timeout: 10_000,
  });

  // 5. Engage boss → combat → victory
  await page.evaluate(() => window.__GAME__!.simulate.engageBoss());
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'CombatScene', {
    timeout: 10_000,
  });

  for (let i = 0; i < 12; i++) {
    const defeated = await page.evaluate(() => {
      const s = window.__GAME__!.getSaveState();
      return s.defeatedBossIds.includes('forest-boss');
    });
    if (defeated) break;
    try {
      await killShotOnce(page);
    } catch {
      await page.waitForTimeout(200);
    }
  }

  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'BossHallScene', {
    timeout: 10_000,
  });

  // 6. Claim chest
  await page.evaluate(() => window.__GAME__!.simulate.clickChest());
  await page.click('[data-testid="chest-overlay-back-to-world-map"]');

  // 7. Persistence contract
  const save = await page.evaluate(() => window.__GAME__!.getSaveState());
  expect(save.defeatedBossIds).toContain('forest-boss');
  expect(save.claimedChestIds).toContain('forest-boss-chest');
  expect(save.currentZoneId).toBeNull();
});
