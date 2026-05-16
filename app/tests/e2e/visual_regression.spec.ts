/**
 * Phase 5 F+1 — Visual Regression Tests
 *
 * Catches the class of bug em đã miss trong Phase 5 visual QA:
 *   - AI-gen assets shipping at wrong native size (1024×1024 thay vì 192×192)
 *   - Checker pattern baked vào PNG thay vì alpha thật
 *   - Phaser scene placement drift sau khi đổi asset
 *
 * Strategy:
 *   1. Boot the app, wait Phaser game ready (window.__GAME__ exposed in DEV).
 *   2. Force PreloadScene → WorldMap to complete (no animations mid-flight).
 *   3. Hide DOM-side animated elements (Sóc onboarding, blinking sparkles)
 *      via CSS mask so React-side fluctuations don't fail the canvas test.
 *   4. expect(page).toHaveScreenshot() — Playwright captures canvas pixels
 *      and compares against committed baseline.
 *
 * Baselines live in tests/e2e/visual_regression.spec.ts-snapshots/.
 * Update with: npx playwright test visual_regression --update-snapshots
 * (only after manual visual verification on a deploy you trust).
 *
 * NOTE on flake: this suite uses ANIMATED game canvas — strict pixel diff
 * is fragile. We use maxDiffPixelRatio=0.02 (2%) to absorb subtle WebGL
 * antialiasing variance across runs while still catching real regressions
 * like "icon rendered at 5× design size".
 */
import { expect, test } from '@playwright/test';

// Visual regression baselines are platform-specific (chromium-win32 vs
// chromium-linux). Until em ships matching Linux baselines, skip in CI to
// avoid spurious failures. Run locally with `npm run test:e2e` and update
// baselines via `--update-snapshots` when intentional visual changes ship.
//
// To wire as hard CI gate later:
//   1. Generate Linux baselines (run CI with --update-snapshots, download
//      artifact, commit *-linux.png files)
//   2. Remove this test.skip()
test.skip(
  ({}, testInfo) => Boolean(process.env.CI) && !process.env.RUN_VISUAL_REGRESSION,
  'Visual regression skipped in CI — set RUN_VISUAL_REGRESSION=1 once Linux baselines committed'
);


const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'home_main_menu', path: '/' },
  { name: 'play_world_map', path: '/play' },
  { name: 'inventory', path: '/inventory' },
  { name: 'quests', path: '/quests' },
  { name: 'guild', path: '/guild' },
  { name: 'settings', path: '/settings' },
];

/**
 * Wait for Phaser game to finish boot + initial scene activation.
 * The DEV-mode bridge exposes `window.__GAME__` once `PhaserGame` mounts.
 * For routes without Phaser (e.g. /quests pure React), we short-circuit.
 */
async function waitForSceneReady(page: import('@playwright/test').Page, hasPhaser: boolean): Promise<void> {
  if (!hasPhaser) {
    await page.waitForLoadState('networkidle');
    return;
  }
  // Wait for Phaser game instance + canvas to exist; don't gate on specific
  // scene (PreloadScene → WorldMapScene transition can race with the wait,
  // and unit tests that bypass Phaser still render a canvas).
  await page.waitForFunction(() => Boolean((window as unknown as { __GAME__?: unknown }).__GAME__), {
    timeout: 15_000,
  });
  await page.locator('canvas').first().waitFor({ timeout: 10_000 });
  // Phaser preload manifest is ~135 assets — give it generous time to settle.
  await page.waitForTimeout(3000);
}

/**
 * Hide React-side overlays that animate independently of canvas content:
 * - Sóc onboarding dialog (slides in)
 * - Floating debug menu
 * - Vercel preview banner / live feedback widget
 */
async function maskVolatileOverlays(page: import('@playwright/test').Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-testid="onboarding-soc"], [data-testid="onboarding-dialog"],
      [class*="onboarding"], [class*="sparkle"], [class*="phantom-cursor"],
      vercel-live-feedback, #claude-agent-glow-border, #claude-phantom-cursor {
        visibility: hidden !important;
      }
    `,
  });
}

for (const route of ROUTES) {
  const hasPhaser = route.path === '/play';
  test(`visual regression — ${route.name} (${route.path})`, async ({ page }) => {
    // Seed minimal save state via localStorage so onboarding doesn't loop.
    await page.goto('/');
    await page.evaluate(() => {
      // Mark Phase E onboarding done so dialogs collapse on /play
      const save = JSON.parse(localStorage.getItem('game_ss3_save_v1') ?? '{"state":{}}');
      if (!save.state) save.state = {};
      save.state.playerName = 'visual-test';
      save.state.gender = 'male';
      save.state.hairStyle = 'a';
      save.state.flags = { ...(save.state.flags ?? {}), onboarding_complete: true };
      localStorage.setItem('game_ss3_save_v1', JSON.stringify(save));
    });

    await page.goto(route.path);
    await waitForSceneReady(page, hasPhaser);
    await maskVolatileOverlays(page);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: false, // viewport-only snapshot for stable diff
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
}
