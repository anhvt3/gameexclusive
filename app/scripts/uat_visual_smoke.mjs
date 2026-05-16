#!/usr/bin/env node
/**
 * uat_visual_smoke.mjs — Phase 5 F+1 visual smoke against deployed Vercel URL.
 *
 * Takes screenshots of every React Router route + checks console errors.
 * Saves PNGs to .gstack/qa-reports/screenshots/ for em / anh to eyeball.
 *
 * Why separate from visual_regression.spec.ts:
 *   - This runs against a deployed URL (Vercel preview), not localhost dev.
 *   - It is one-shot, not CI-gated. Use for manual visual verification.
 *   - visual_regression.spec.ts is the CI gate against `npm run dev`.
 *
 * Usage:
 *   UAT_URL=https://...vercel.app node scripts/uat_visual_smoke.mjs
 */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.gstack/qa-reports/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const UAT_URL = process.env.UAT_URL;
if (!UAT_URL) {
  console.error('UAT_URL env var required');
  process.exit(1);
}

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'play', path: '/play' },
  { name: 'inventory', path: '/inventory' },
  { name: 'quests', path: '/quests' },
  { name: 'guild', path: '/guild' },
  { name: 'settings', path: '/settings' },
];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const results = [];

  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });
    const failedReqs = [];
    page.on('requestfailed', (r) =>
      failedReqs.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText ?? '?'}`)
    );
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().includes('/assets/')) {
        failedReqs.push(`HTTP ${r.status()} ${r.url()}`);
      }
    });

    try {
      // Seed save state so onboarding doesn't block screenshot
      await page.goto(`${UAT_URL}/?cu=999300`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem('game_ss3_save_v1') ?? '{"state":{}}');
        if (!save.state) save.state = {};
        save.state.playerName = 'visual-smoke';
        save.state.gender = 'male';
        save.state.hairStyle = 'a';
        save.state.flags = { ...(save.state.flags ?? {}), onboarding_complete: true };
        localStorage.setItem('game_ss3_save_v1', JSON.stringify(save));
      });
      await page.goto(`${UAT_URL}${route.path}?cu=999300`, { waitUntil: 'networkidle', timeout: 30_000 });
      // Give Phaser a moment to load and render
      await page.waitForTimeout(3000);
      const outPath = path.join(OUT, `route_${route.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      results.push({
        name: route.name,
        path: route.path,
        ok: errors.length === 0 && failedReqs.length === 0,
        errors: errors.slice(0, 5),
        failedReqs: failedReqs.slice(0, 5),
        screenshot: outPath,
      });
    } catch (err) {
      results.push({ name: route.name, path: route.path, ok: false, errors: [String(err)] });
    } finally {
      await page.close();
    }
  }

  await ctx.close();
  await browser.close();

  console.log('\n=== Visual smoke results ===');
  let failed = 0;
  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL';
    console.log(`${status} — ${r.name} (${r.path}) → ${r.screenshot ?? '(no screenshot)'}`);
    if (r.errors?.length) {
      for (const e of r.errors) console.log(`  err: ${e}`);
    }
    if (r.failedReqs?.length) {
      for (const e of r.failedReqs) console.log(`  net: ${e}`);
    }
    if (!r.ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} routes clean`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
