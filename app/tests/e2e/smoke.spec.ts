import { test, expect } from '@playwright/test';

/**
 * Harness E2E smoke test — Game_SS3_exclusive
 *
 * Purpose: Verify Vite dev server boots and renders root React app.
 * This is NOT game content — game content comes in ISP Step 21+.
 */
test('dev server serves root page with React app mounted', async ({ page }) => {
  await page.goto('/');

  // Vite default template has <h1>Vite + React</h1> — kept as baseline marker
  await expect(page.locator('body')).not.toBeEmpty();

  // No uncaught errors in console
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // wait for idle
  await page.waitForLoadState('networkidle');

  expect(errors, `Console errors detected: ${errors.join('\n')}`).toHaveLength(0);
});
