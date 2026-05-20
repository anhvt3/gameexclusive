/**
 * gameplay_full.mjs — End-to-end gameplay verifier
 *
 * Drives the full happy-path loop on a deployed Vercel build by opening
 * the URL with ?test=1 to enable window.__GAME__ bridge, then calling
 * scene methods directly (clickSpell, advanceZoneScreen, submitQuiz, ...).
 *
 * This bypasses the Phaser canvas pointer-event problem that vanilla
 * Playwright / Chrome DevTools MCP synthesized clicks can't solve.
 *
 * Usage:
 *   UAT_URL=https://... TEST_USER=991001 node scripts/gameplay_full.mjs
 *
 * Exit code: 0 if all asserts pass, 1 on first failure (with screenshot
 * + summary written to docs/test_execution_screenshots/gameplay_full/).
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SHOT_DIR = resolve(REPO_ROOT, 'docs', 'test_execution_screenshots', 'gameplay_full');

const UAT_URL = process.env.UAT_URL || 'https://gameexclusive-git-claude-phase5-vercel-mysql-6e685e-anhvt3.vercel.app';
const TEST_USER = process.env.TEST_USER || String(Date.now()).slice(-7);
const PAGE_URL = `${UAT_URL}/?cu=${TEST_USER}&test=1`;

const log = (msg) => console.log(`[gameplay] ${msg}`);
const fail = (msg) => { console.error(`[gameplay] FAIL — ${msg}`); throw new Error(msg); };

async function shot(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: resolve(SHOT_DIR, `${name}.png`), fullPage: false });
}

async function waitForBridge(page) {
  await page.waitForFunction(() => typeof window.__GAME__ === 'object' && window.__GAME__ != null, {
    timeout: 30000,
  });
  log('__GAME__ bridge attached');
}

async function call(page, fn) {
  return await page.evaluate(fn);
}

async function main() {
  const results = [];
  const startedAt = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[browser:error]', m.text());
  });

  try {
    log(`Opening ${PAGE_URL}`);
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    await waitForBridge(page);
    await shot(page, '01_loaded');

    // ────────────────────────────────────────────────────────────────
    // Step 1 — Skip tutorial, reset save, get to WorldMap
    // ────────────────────────────────────────────────────────────────
    log('Step 1: reset save + complete tutorial + start world map');
    await call(page, () => {
      window.__GAME__.simulate.resetSaveState();
      window.__GAME__.simulate.completeTutorial();
      window.__GAME__.simulate.startWorldMap();
    });
    await page.waitForTimeout(1500);
    const scene1 = await call(page, () => window.__GAME__.state.activeScene());
    if (scene1 !== 'WorldMapScene') fail(`expected WorldMapScene, got ${scene1}`);
    results.push({ step: 1, name: 'WorldMap reached', pass: true });
    await shot(page, '02_worldmap');

    // ────────────────────────────────────────────────────────────────
    // Step 2 — Click Forest island → ZoneScene (entrance)
    // ────────────────────────────────────────────────────────────────
    log('Step 2: click forest island');
    await call(page, () => window.__GAME__.simulate.clickIsland('forest'));
    await page.waitForTimeout(1500);
    const scene2 = await call(page, () => window.__GAME__.state.activeScene());
    if (scene2 !== 'ZoneScene') fail(`expected ZoneScene, got ${scene2}`);
    results.push({ step: 2, name: 'ZoneScene entrance reached', pass: true });
    await shot(page, '03_zone_entrance');

    // ────────────────────────────────────────────────────────────────
    // Step 3 — Advance entrance → path
    // ────────────────────────────────────────────────────────────────
    log('Step 3: advance entrance → path');
    await call(page, () => window.__GAME__.simulate.advanceZoneScreen());
    await page.waitForTimeout(1500);
    await shot(page, '04_zone_path');

    // ────────────────────────────────────────────────────────────────
    // Step 4 — Walk path until combat triggers (first monster contact)
    // ────────────────────────────────────────────────────────────────
    log('Step 4: walk path safely until combat');
    await call(page, () => window.__GAME__.simulate.walkPathSafe());
    await page.waitForTimeout(1500);
    // walkPathSafe walks to right edge skipping monsters — to actually
    // engage we explicitly trigger combat with the first monster.
    log('Step 4b: explicitly enter combat with path monster id=1 (embershed)');
    await call(page, () => window.__GAME__.simulate.enterCombat(1));
    await page.waitForTimeout(2500);
    const scene4 = await call(page, () => window.__GAME__.state.activeScene());
    if (scene4 !== 'CombatScene') fail(`expected CombatScene after enterCombat, got ${scene4}`);
    const monsterIn = await call(page, () => window.__GAME__.state.combatMonsterId());
    if (monsterIn !== 1) fail(`expected monster id 1, got ${monsterIn}`);
    results.push({ step: 4, name: 'CombatScene reached vs monster id=1', pass: true });
    await shot(page, '05_combat_engaged');

    // ────────────────────────────────────────────────────────────────
    // Step 5 — Cast Fire spell + answer quiz correctly until victory
    // ────────────────────────────────────────────────────────────────
    log('Step 5: cast Fire repeatedly + answer correct until victory');
    let safety = 12;
    while (safety-- > 0) {
      const cs = await call(page, () => window.__GAME__.state.combatState());
      if (cs === 'victory' || cs === 'defeat') break;
      await call(page, () => {
        try { window.__GAME__.simulate.clickSpell('fire'); } catch (_e) { /* not in spell state */ }
      });
      await page.waitForTimeout(400);
      await call(page, () => {
        try { window.__GAME__.simulate.submitQuiz(true); } catch (_e) { /* not in quiz state */ }
      });
      await page.waitForTimeout(600);
    }
    const finalCs = await call(page, () => window.__GAME__.state.combatState());
    log(`Combat ended with state=${finalCs} after ${12 - safety} rounds`);
    if (finalCs !== 'victory') fail(`expected victory, got ${finalCs}`);
    results.push({ step: 5, name: `combat won vs monster 1 in ${12 - safety} rounds`, pass: true });
    await shot(page, '06_combat_victory');

    // ────────────────────────────────────────────────────────────────
    // Step 6 — Return to ZoneScene + walk → boss hall
    // ────────────────────────────────────────────────────────────────
    log('Step 6: emit exit combat + start boss hall');
    await call(page, () => {
      window.__GAME__.simulate.emitCombatExit(true, 25);
      window.__GAME__.simulate.startBossHall('forest-island');
    });
    await page.waitForTimeout(2500);
    const scene6 = await call(page, () => window.__GAME__.state.activeScene());
    if (scene6 !== 'BossHallScene') fail(`expected BossHallScene, got ${scene6}`);
    results.push({ step: 6, name: 'BossHallScene reached', pass: true });
    await shot(page, '07_boss_hall');

    // ────────────────────────────────────────────────────────────────
    // Step 7 — Engage boss + assert texture is aldergasp (B-05 fix)
    // ────────────────────────────────────────────────────────────────
    log('Step 7: engage boss + verify monster id=99 aldergasp');
    await call(page, () => window.__GAME__.simulate.engageBoss());
    await page.waitForTimeout(3000);
    const scene7 = await call(page, () => window.__GAME__.state.activeScene());
    const bossId = await call(page, () => window.__GAME__.state.combatMonsterId());
    if (scene7 !== 'CombatScene') fail(`expected CombatScene for boss, got ${scene7}`);
    if (bossId !== 99) fail(`expected boss id=99, got ${bossId}`);
    // Critical asset assertion — verify Phaser actually loaded the texture
    const texLoaded = await call(page, () => {
      const game = window.__GAME__.__phaser;
      return game?.textures?.exists?.('monster_aldergasp_idle');
    });
    if (!texLoaded) fail('monster_aldergasp_idle texture NOT loaded — B-05 still broken');
    results.push({ step: 7, name: 'boss combat engaged + aldergasp texture loaded', pass: true });
    await shot(page, '08_boss_combat');

    // ────────────────────────────────────────────────────────────────
    // Step 8 — Cast spells to defeat boss
    // ────────────────────────────────────────────────────────────────
    log('Step 8: defeat boss (aldergasp weakness = Fire per Plant element)');
    safety = 20;
    while (safety-- > 0) {
      const cs = await call(page, () => window.__GAME__.state.combatState());
      if (cs === 'victory' || cs === 'defeat') break;
      await call(page, () => {
        try { window.__GAME__.simulate.clickSpell('fire'); } catch (_e) { /* not in spell state */ }
      });
      await page.waitForTimeout(400);
      await call(page, () => {
        try { window.__GAME__.simulate.submitQuiz(true); } catch (_e) { /* not in quiz state */ }
      });
      await page.waitForTimeout(600);
    }
    const bossEndState = await call(page, () => window.__GAME__.state.combatState());
    log(`Boss combat ended with state=${bossEndState} after ${20 - safety} rounds`);
    if (bossEndState !== 'victory') fail(`expected boss victory, got ${bossEndState}`);
    results.push({ step: 8, name: `boss defeated in ${20 - safety} rounds`, pass: true });
    await shot(page, '09_boss_victory');

    // ────────────────────────────────────────────────────────────────
    // Summary
    // ────────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    log(`✅ ALL ${results.length} steps PASSED in ${elapsed}s`);
    console.table(results);
    await writeFile(resolve(SHOT_DIR, 'summary.json'),
      JSON.stringify({ url: PAGE_URL, results, elapsed_sec: Number(elapsed), passed_at: new Date().toISOString() }, null, 2),
      'utf8'
    );
    return 0;
  } catch (err) {
    console.error('[gameplay] ERROR:', err.message);
    try { await shot(page, '99_failure'); } catch (_e) { /* shot may fail if page closed */ }
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    await mkdir(SHOT_DIR, { recursive: true });
    await writeFile(resolve(SHOT_DIR, 'summary.json'),
      JSON.stringify({ url: PAGE_URL, results, error: err.message, elapsed_sec: Number(elapsed), failed_at: new Date().toISOString() }, null, 2),
      'utf8'
    );
    return 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().then((code) => process.exit(code));
