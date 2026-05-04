import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Sprint C Task 11.
 *
 * Drives the full pet-rescue user loop:
 *   Menu → Forest WorldMap → ZoneScene path → BossHallScene → CombatScene
 *   → seed RNG so rescue-gate passes → kill boss → PET_RESCUE_OFFERED
 *   → click Thu thập → ownedPets[0] auto-equipped via active_pet_instance_id.
 *
 * Mirrors `sprint_b_zone_flow.spec.ts` for the boss-kill path; layers the
 * pet-rescue overlay assertion on top.
 *
 * Per Sprint B precedent, this spec uses `simulate.startBossHall` /
 * `simulate.engageBoss` test-bridge methods to bypass intra-scene
 * `advance()` transitions which are flaky in headless Chromium.
 */

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

test('sprint C: rescue → collect → equip → ownedPets reflects auto-equip', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/');

  // Skip tutorial — seed Zustand's persisted save with tutorial_completed.
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

  // Seed RNG before combat starts so the rescue-gate roll is deterministic.
  // CombatScene._combatRng drives both combat and the post-victory rescue
  // roll. seedRng dispatches via dynamic ESM import; allow the microtask
  // to flush before relying on it.
  await page.evaluate(() => window.__GAME__!.simulate.seedRng(0.05));
  await page.waitForTimeout(50);

  // 1. World Map → Forest → ZoneScene
  await page.evaluate(() => window.__GAME__!.simulate.startWorldMap());
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'WorldMapScene', {
    timeout: 10_000,
  });
  await page.evaluate(() => window.__GAME__!.simulate.clickIsland('forest'));
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'ZoneScene', {
    timeout: 10_000,
  });

  // 2. Direct-start ZoneScene in 'path' mode
  await page.evaluate(() => window.__GAME__!.simulate.startZonePath('forest-island'));
  await page.waitForFunction(
    () => {
      const s = window.__GAME__?.__phaser.scene.getScene('ZoneScene') as {
        getScreen?: () => string;
        sys?: { isActive?: () => boolean };
      } | null;
      return Boolean(s && s.getScreen?.() === 'path' && s.sys?.isActive?.());
    },
    { timeout: 10_000 }
  );

  // 3. Walk path safely
  await page.evaluate(async () => {
    await window.__GAME__!.simulate.walkPathSafe();
  });

  // 4. Direct-start BossHallScene
  await page.evaluate(() => window.__GAME__!.simulate.startBossHall('forest-island'));
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'BossHallScene', {
    timeout: 10_000,
  });

  // 5. Engage boss → CombatScene
  await page.evaluate(() => window.__GAME__!.simulate.engageBoss());
  await page.waitForFunction(() => window.__GAME__?.state.activeScene() === 'CombatScene', {
    timeout: 10_000,
  });

  // 6. One-shot the boss (loop tolerant of QUIZ_GATE re-rolls).
  for (let i = 0; i < 12; i++) {
    const defeated = await page.evaluate(() =>
      window.__GAME__!.getSaveState().defeatedBossIds.includes('forest-boss')
    );
    if (defeated) break;
    try {
      await killShotOnce(page);
    } catch {
      await page.waitForTimeout(200);
    }
  }

  // 7. Pet rescue overlay appears (post-victory, layered above BossHallScene).
  await page.waitForSelector('[data-testid="pet-rescue-overlay"]', { timeout: 10_000 });
  await page.click('[data-testid="pet-rescue-collect"]');

  // 8. Roster has one pet, auto-equipped (first-pet-becomes-active rule
  //    in SaveStateStore.addPetToRoster).
  await page.waitForFunction(() => window.__GAME__!.getSaveState().ownedPets.length === 1, {
    timeout: 5_000,
  });
  const save = await page.evaluate(() => window.__GAME__!.getSaveState());
  expect(save.ownedPets).toHaveLength(1);
  expect(save.active_pet_instance_id).toBe(save.ownedPets[0]!.instanceId);
});
