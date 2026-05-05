/**
 * E2E — Sprint E Task 14.
 *
 * First-launch onboarding loop entirely in React DOM (no Phaser scene
 * state needed for the modals): MainMenu → click "Bắt đầu" → 8 tutorial
 * beats → NamePicker (Minh) → CustomizationPicker (hair-c, confirm) →
 * /play. Verifies SaveState persists, then reloads to confirm onboarding
 * does NOT re-trigger.
 *
 * Per Sprint B/C/D precedent, runs with --workers=1.
 *
 * MascotDialog uses a 25ms-per-character typewriter. Clicking while
 * still typing jumps to full text without firing onContinue (button
 * label is "Bỏ qua" then). Clicking when full ("Tiếp" / "Bắt đầu")
 * advances. So each tutorial beat needs at most 2 clicks; we click in a
 * loop until the next stage marker appears.
 */

import { test, expect, type Page } from '@playwright/test';
import { TUTORIAL_STEPS } from '../../src/react/mascot/tutorialSteps';

test.use({ baseURL: 'http://localhost:5173' });

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__GAME__?.__phaser), { timeout: 15_000 });
}

test('sprint E first launch: tutorial → name → customization → /play with Minh personalization', async ({
  page,
}) => {
  test.setTimeout(60_000);

  // Clean slate — clear localStorage, reload.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // First launch: MainMenu shows "Khách" (PLAYER_NAME_PLACEHOLDER).
  await expect(page.getByText(/Xin chào, Khách/)).toBeVisible();

  // Click Bắt đầu — opens onboarding (playerName=null + tutorial_completed=false).
  await page.click('[data-testid="main-menu-play"]');

  // OnboardingFlow renders TutorialSequence first.
  await expect(page.locator('[data-testid="onboarding-flow"]')).toBeVisible();

  // Walk through all tutorial beats. MascotDialog typewriter at 25ms/char +
  // click-during-typing jumps to full text (button label "Bỏ qua") instead of
  // advancing. So per beat: click → (maybe jump-to-full) → click again →
  // advance. Loop until NamePicker title appears.
  const nameTitle = page.getByText(/Chọn tên của bạn/);
  const advanceBtn = page.locator('[role="dialog"][aria-label="Sóc nói"] button');

  const maxClicks = TUTORIAL_STEPS.length * 3 + 4; // safety budget
  for (let i = 0; i < maxClicks; i++) {
    if (await nameTitle.isVisible().catch(() => false)) break;
    if (await advanceBtn.isVisible().catch(() => false)) {
      await advanceBtn.click({ timeout: 2_000 }).catch(() => {});
    }
    await page.waitForTimeout(80);
  }

  // NamePicker visible.
  await expect(nameTitle).toBeVisible({ timeout: 10_000 });

  // Click Minh preset.
  await page.click('[data-testid="name-preset-Minh"]');

  // CustomizationPicker appears.
  await expect(page.getByText(/Tuỳ chỉnh nhân vật/)).toBeVisible();

  // Pick hair-c, confirm.
  await page.click('[data-testid="hair-c"]');
  await page.click('[data-testid="customization-confirm"]');

  // After complete, MainMenu navigates to /play. Verify SaveState persists.
  await waitForGame(page);
  const save = await page.evaluate(() => window.__GAME__!.getSaveState());
  expect(save.playerName).toBe('Minh');
  expect(save.gender).toBe('male');
  expect(save.hairStyle).toBe('c');
  expect(save.flags.tutorial_completed).toBe(true);

  // Reload — onboarding should NOT re-trigger.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Xin chào, Minh/)).toBeVisible();

  // Click Bắt đầu — should go straight to /play, no onboarding modal.
  await page.click('[data-testid="main-menu-play"]');
  await expect(page.locator('[data-testid="onboarding-flow"]')).not.toBeVisible();
});
