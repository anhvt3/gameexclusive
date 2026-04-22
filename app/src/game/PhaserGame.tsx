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
import { CombatScene } from './scenes/CombatScene';

interface Props {
  width?: number;
  height?: number;
}

export function PhaserGame({ width = 1280, height = 720 }: Props) {
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
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [BootScene, PreloadScene, WorldScene, CombatScene],
    });
    gameRef.current = game;

    return () => {
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
