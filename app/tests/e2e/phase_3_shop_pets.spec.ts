import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Phase 3 Task 17.
 *
 * Drives the shop-buy + breeding flow end-to-end:
 *   fresh save → earn 500+ stars via emitCombatExit bridge
 *   → open MainMenu shop → verify 5 slots → buy first item → balance decreases, inventory grows
 *   → seed 2 pets via seedPetForBreeding bridge
 *   → open breeding overlay → pick both parents → breed → egg hatches → roster grows
 *
 * Bridge pattern: __GAME__ is only attached on /play (where PhaserGame mounts).
 * Setup / event injection happen on /play; MainMenu UI assertions happen on / (React Router).
 */

const PLAY_URL = 'http://localhost:5173/play';
const HOME_URL = 'http://localhost:5173/';

async function waitForBridge(page: Page) {
  await page.waitForFunction(() => Boolean((window as { __GAME__?: unknown }).__GAME__), null, {
    timeout: 30_000,
  });
}

async function readSaveState(page: Page): Promise<{
  battleStars: number;
  inventoryLen: number;
  ownedPetsLen: number;
  shopStockLen: number;
  breedingChamber: unknown;
}> {
  return page.evaluate(() => {
    const raw = Object.keys(localStorage)
      .filter((k) => k.includes('save'))
      .map((k) => localStorage.getItem(k))
      .find((v) => v && v.includes('battleStars'));
    if (!raw)
      return {
        battleStars: 0,
        inventoryLen: 0,
        ownedPetsLen: 0,
        shopStockLen: 0,
        breedingChamber: null,
      };
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } & Record<string, unknown>;
    const state = (parsed.state ?? parsed) as Record<string, unknown>;
    return {
      battleStars: (state['battleStars'] as number) ?? 0,
      inventoryLen: ((state['inventory'] as unknown[]) ?? []).length,
      ownedPetsLen: ((state['ownedPets'] as unknown[]) ?? []).length,
      shopStockLen: ((state['shopStock'] as unknown[]) ?? []).length,
      breedingChamber: state['breedingChamber'] ?? null,
    };
  });
}

test.describe('Phase 3 — Shop + Breeding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAY_URL);
    await waitForBridge(page);
    await page.evaluate(() => {
      const g = (
        window as {
          __GAME__: {
            simulate: {
              resetSaveState: () => void;
              completeTutorial: () => void;
            };
          };
        }
      ).__GAME__;
      g.simulate.resetSaveState();
      g.simulate.completeTutorial();
    });
    // Allow Zustand persist to flush to localStorage
    await page.waitForTimeout(200);
  });

  test('earn stars → buy shop item → seed 2 pets → breed → roster grows', async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Earn ~500 stars via 100 wins using bridge
    await page.evaluate(() => {
      const g = (
        window as {
          __GAME__: {
            simulate: { emitCombatExit: (won: boolean) => void };
          };
        }
      ).__GAME__;
      for (let i = 0; i < 100; i++) g.simulate.emitCombatExit(true);
    });
    // Allow DailyRewardEngine to process and Zustand to persist
    await page.waitForTimeout(800);

    // 2. Navigate to MainMenu (__GAME__ bridge not available at /, use element wait instead)
    await page.goto(HOME_URL);
    await page.getByTestId('main-menu-shop').waitFor({ state: 'visible', timeout: 10_000 });

    const stateBefore = await readSaveState(page);
    expect(stateBefore.battleStars).toBeGreaterThanOrEqual(500);

    // 3. Open shop via MainMenu button
    await page.getByTestId('main-menu-shop').click();
    await expect(page.getByTestId('shop-overlay')).toBeVisible({ timeout: 5_000 });

    // 4. Verify 5 shop item slots rendered
    await expect(page.getByTestId('shop-item-card')).toHaveCount(5);

    // 5. Buy first item — balance should drop, inventory should grow
    const balanceBefore = stateBefore.battleStars;
    await page.getByTestId('shop-buy-btn').first().click();
    await page.waitForTimeout(700); // roundtrip + state update

    const stateAfterBuy = await readSaveState(page);
    expect(stateAfterBuy.battleStars).toBeLessThan(balanceBefore);
    expect(stateAfterBuy.inventoryLen).toBeGreaterThanOrEqual(stateBefore.inventoryLen + 1);

    // 6. Close shop
    await page.getByTestId('shop-close-btn').click();
    await expect(page.getByTestId('shop-overlay')).not.toBeVisible();

    // 7. Seed 2 pets via bridge (different element pair: pyropup=Fire, aquakit=Water)
    //    Bridge only available on /play
    await page.goto(PLAY_URL);
    await waitForBridge(page);
    await page.evaluate(() => {
      const g = (
        window as {
          __GAME__: {
            simulate: { seedPetForBreeding: (c: string, l: number) => void };
          };
        }
      ).__GAME__;
      g.simulate.seedPetForBreeding('pyropup', 3);
      g.simulate.seedPetForBreeding('aquakit', 5);
    });
    await page.waitForTimeout(600); // dynamic import settle + Zustand flush

    // 8. Navigate back to MainMenu (__GAME__ bridge not available at /)
    await page.goto(HOME_URL);
    await page.getByTestId('main-menu-breeding').waitFor({ state: 'visible', timeout: 10_000 });

    const stateAfterSeed = await readSaveState(page);
    expect(stateAfterSeed.ownedPetsLen).toBeGreaterThanOrEqual(2);

    // 9. Open breeding overlay
    await page.getByTestId('main-menu-breeding').click();
    await expect(page.getByTestId('breed-overlay')).toBeVisible({ timeout: 5_000 });

    // 10. Pick parent A (first empty slot) then parent B (second empty slot)
    const emptySlots = page.getByTestId('pet-slot-empty');
    await emptySlots.first().click();
    await page.waitForTimeout(300);
    await emptySlots.first().click();
    await page.waitForTimeout(300);

    // 11. Click Breed button
    const beforeBreed = await readSaveState(page);
    await page.getByTestId('breed-start-btn').click();

    // 12. Wait for egg hatch anim (500ms shake + 1500ms hatch + buffer)
    await page.waitForTimeout(2_500);

    // 13. Confirm done button appears and dismiss
    await page.getByTestId('breed-done-btn').waitFor({ state: 'visible', timeout: 5_000 });
    await page.getByTestId('breed-done-btn').click();

    // 14. Verify roster grew + breedingChamber cleared
    await page.waitForTimeout(500);
    const finalState = await readSaveState(page);
    expect(finalState.ownedPetsLen).toBeGreaterThan(beforeBreed.ownedPetsLen);
    expect(finalState.breedingChamber).toBeNull();
  });
});
