/**
 * PhaserGame — ISP v1.1 Step 10
 *
 * React component that mounts a Phaser.Game inside a div.
 * On unmount: calls game.destroy(true, false) per AP §7.4 (memory leak prevention).
 *
 * Props:
 *   width, height — canvas base resolution (default 1280×720 per AP)
 *
 * File lives in src/game/ (bridge layer) per AP 3.1 folder structure.
 * React + Phaser imports are external npm packages (not subject to layer boundary).
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { ZoneScene } from './scenes/ZoneScene';
import { BossHallScene } from './scenes/BossHallScene';
import { CombatScene } from './scenes/CombatScene';
import { attachGameTestBridge, detachGameTestBridge } from '@/testing/gameTestBridge';

interface Props {
  width?: number;
  height?: number;
}

export function PhaserGame({ width = 960, height = 640 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return; // guard against StrictMode double-invoke

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      parent: containerRef.current,
      backgroundColor: '#2a5a3a',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [
        BootScene,
        PreloadScene,
        WorldScene,
        WorldMapScene,
        ZoneScene,
        BossHallScene,
        CombatScene,
      ],
      input: {
        keyboard: {
          // Capture WASD + arrow keys so the browser doesn't scroll on
          // arrow-down and so the game receives input even when a non-form
          // DOM element holds focus. Numeric keycodes (87/65/83/68 = WASD,
          // 38-40 + 37 = arrows) — using literals avoids reaching into
          // Phaser.Input.Keyboard.KeyCodes which our test mocks don't stub.
          capture: [87, 65, 83, 68, 38, 40, 37, 39],
        },
      },
    });
    gameRef.current = game;
    // Make the canvas focusable so keystrokes route to it even when a
    // React UI element above the canvas (eg the closed Tutorial dialog)
    // had stolen focus a moment earlier. We focus once on mount; clicks
    // on the canvas keep it focused thereafter via tabindex=0.
    requestAnimationFrame(() => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
      }
    });

    // DEV/test bridge: expose window.__GAME__ so Playwright (Step 22) can drive
    // the game without pixel-matching the canvas. Stripped in prod by Vite.
    if (import.meta.env.DEV) {
      attachGameTestBridge(game);
    }

    return () => {
      if (import.meta.env.DEV) {
        detachGameTestBridge();
      }
      game.destroy(true, false);
      gameRef.current = null;
    };
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      data-testid="phaser-container"
      className="phaser-container h-full w-full"
    />
  );
}
