/**
 * PreloadScene — ISP v1.1 Step 11
 *
 * Loads essential Phase 1 assets with progress bar UI.
 * On complete: transition to WorldScene.
 *
 * Assets loaded here are MINIMUM for harness validation.
 * Full asset manifest (5 monsters + mascot + tileset) expands in Step 12+
 * once Antigravity delivers per batch_plan_v2.
 */

import Phaser from 'phaser';
import { ITEM_REGISTRY } from '@data/staticConfig/items';
import { PLAYER_BASE_MALE_KEY } from '../entities/PlayerAvatar';

export const PRELOAD_SCENE_KEY = 'PreloadScene';

/**
 * Phase 1 asset manifest — Antigravity delivery (22/04/2026).
 * Keys follow convention: category_codename_state.
 */

const MONSTERS = ['embershed', 'tidus', 'applepot', 'frostfang', 'voltee'] as const;
const MONSTER_STATES = ['idle', 'attack', 'hurt', 'death'] as const;
const SPELL_ELEMENTS = [
  'fire',
  'water',
  'earth',
  'ice',
  'storm',
  'plant',
  'shadow',
  'astral',
] as const;

export const PHASE1_ASSETS = {
  images: [
    // Backgrounds
    { key: 'bg_combat_forest', path: '/assets/backgrounds/combat_forest_1280x720.png' },
    { key: 'bg_main_menu', path: '/assets/backgrounds/main_menu_bg.png' },
    // Tileset
    { key: 'forest_tileset', path: '/assets/tilesets/forest_tileset_256.png' },
    // Mascot Sóc — 4 poses
    { key: 'mascot_soc_greet', path: '/assets/mascot/soc_guide_greet_512.png' },
    { key: 'mascot_soc_talk', path: '/assets/mascot/soc_guide_talk_256.png' },
    { key: 'mascot_soc_cheer', path: '/assets/mascot/soc_guide_cheer_512.png' },
    { key: 'mascot_soc_think', path: '/assets/mascot/soc_guide_think_256.png' },
    // Player wizard portraits
    {
      key: 'wizard_portrait_neutral',
      path: '/assets/player/wizard_male_portrait_neutral_128.png',
    },
    {
      key: 'wizard_portrait_excited',
      path: '/assets/player/wizard_male_portrait_excited_128.png',
    },
    {
      key: 'wizard_portrait_worried',
      path: '/assets/player/wizard_male_portrait_worried_128.png',
    },
    {
      key: 'wizard_portrait_focused',
      path: '/assets/player/wizard_male_portrait_focused_128.png',
    },
    // Monsters — 5 starters × 4 states = 20
    ...MONSTERS.flatMap((codename) =>
      MONSTER_STATES.map((state) => ({
        key: `monster_${codename}_${state}`,
        path: `/assets/monsters/${codename}_${state}_128.png`,
      }))
    ),
    // UI — HP/MP bars 4 states each
    { key: 'hp_bar_empty', path: '/assets/ui/hp_bar_empty.png' },
    { key: 'hp_bar_100', path: '/assets/ui/hp_bar_100.png' },
    { key: 'hp_bar_50', path: '/assets/ui/hp_bar_50.png' },
    { key: 'hp_bar_20', path: '/assets/ui/hp_bar_20.png' },
    { key: 'mp_bar_empty', path: '/assets/ui/mp_bar_empty.png' },
    { key: 'mp_bar_100', path: '/assets/ui/mp_bar_100.png' },
    { key: 'mp_bar_50', path: '/assets/ui/mp_bar_50.png' },
    { key: 'mp_bar_20', path: '/assets/ui/mp_bar_20.png' },
    // Spell icons (8 elements)
    ...SPELL_ELEMENTS.map((elem) => ({
      key: `spell_icon_${elem}`,
      path: `/assets/ui/spell_icon_${elem}.png`,
    })),
    // Banners
    { key: 'banner_victory', path: '/assets/ui/banner_victory_800x120.png' },
    { key: 'banner_defeat', path: '/assets/ui/banner_defeat.png' },
    { key: 'banner_levelup', path: '/assets/ui/banner_levelup_800x120.png' },
    // Step 22.12 — base player body for layered avatar
    {
      key: PLAYER_BASE_MALE_KEY,
      path: '/assets/juice/base_player_male_transparent.png',
    },
    // Step 22.12 — equipment overlay sprites (10 keys per Appendix H §H.5)
    ...ITEM_REGISTRY.map((item) => ({
      key: item.spriteKey,
      path: item.spritePath,
    })),
  ] as Array<{ key: string; path: string }>,
  spritesheets: [
    {
      key: 'wizard_walk',
      path: '/assets/player/wizard_male_walk_spritesheet_128x128.png',
      frameWidth: 128,
      frameHeight: 128,
    },
  ] as Array<{
    key: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
  }>,
  tilemaps: [] as Array<{ key: string; path: string }>,
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(PRELOAD_SCENE_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;

    // Progress bar primitives
    const barWidth = 400;
    const barHeight = 20;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 - barHeight / 2;

    const bg = this.add.rectangle(width / 2, barY + barHeight / 2, barWidth, barHeight, 0x222244);
    const fill = this.add.rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xd4691e);
    fill.setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, barY - 24, 'Đang tải...', { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });

    this.load.once('complete', () => {
      bg.destroy();
      fill.destroy();
      label.destroy();
    });

    // Register asset loads (manifest may be empty in Phase 1 setup — that's OK)
    for (const img of PHASE1_ASSETS.images) {
      this.load.image(img.key, img.path);
    }
    for (const sheet of PHASE1_ASSETS.spritesheets) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const map of PHASE1_ASSETS.tilemaps) {
      this.load.tilemapTiledJSON(map.key, map.path);
    }
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
