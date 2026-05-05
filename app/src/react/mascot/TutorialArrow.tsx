import { useEffect, useState } from 'react';
import type { GestureTarget } from '@/types/identity';
import { readSceneAnchor } from './sceneAnchorRegistry';

interface ArrowPosition {
  x: number;
  y: number;
}

const ARROW_OFFSET_X = 16; // half arrow width
const ARROW_OFFSET_Y = 48; // arrow height + tail

export function TutorialArrow({ target }: { target: GestureTarget }) {
  const [pos, setPos] = useState<ArrowPosition | null>(null);

  useEffect(() => {
    const compute = (): void => {
      if (target.type === 'dom') {
        const el = document.querySelector<HTMLElement>(`[data-testid="${target.selector}"]`);
        if (!el) {
          setPos(null);
          return;
        }
        const rect = el.getBoundingClientRect();
        setPos({
          x: rect.left + rect.width / 2 - ARROW_OFFSET_X,
          y: rect.top - ARROW_OFFSET_Y,
        });
        return;
      }
      // canvas
      const anchor = readSceneAnchor(target.selector);
      if (!anchor) {
        setPos(null);
        return;
      }
      const container = document.querySelector<HTMLElement>('[data-testid="phaser-container"]');
      const canvas = container?.querySelector('canvas');
      if (!canvas) {
        setPos(null);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      setPos({
        x: rect.left + anchor.x - ARROW_OFFSET_X,
        y: rect.top + anchor.y - ARROW_OFFSET_Y,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [target]);

  if (!pos) return null;
  return (
    <div
      data-testid="tutorial-arrow"
      role="presentation"
      className="pointer-events-none fixed z-50 animate-bounce"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <span className="text-4xl drop-shadow-lg">⬇️</span>
    </div>
  );
}
