import { describe, expect, it } from 'vitest';
import { loadWalkableMaskFromImageData, type WalkableMask } from './WalkableMask';
import { findPath, ASTAR_ITERATION_CAP } from './AStar';

function maskFromAscii(rows: string[]): WalkableMask {
  const h = rows.length;
  const w = rows[0]!.length;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x]!;
      const black = ch === '.';
      const i = (y * w + x) * 4;
      data[i] = black ? 0 : 255;
      data[i + 1] = black ? 0 : 255;
      data[i + 2] = black ? 0 : 255;
      data[i + 3] = 255;
    }
  }
  return loadWalkableMaskFromImageData({
    data,
    width: w,
    height: h,
    colorSpace: 'srgb',
  } as ImageData);
}

describe('AStar.findPath', () => {
  it('returns straight diagonal on open mask', () => {
    const mask = maskFromAscii(['....', '....', '....', '....']);
    const path = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 3, y: 3 });
  });

  it('routes around an obstacle', () => {
    const mask = maskFromAscii(['....', '.##.', '.##.', '....']);
    const path = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path.length).toBeGreaterThan(0);
    for (const p of path) {
      expect(mask.isWalkable(p.x, p.y)).toBe(true);
    }
  });

  it('returns empty when goal is blocked', () => {
    const mask = maskFromAscii(['....', '....', '....', '...#']);
    const path = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path).toEqual([]);
  });

  it('returns empty when start is blocked', () => {
    const mask = maskFromAscii(['#...', '....', '....', '....']);
    const path = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path).toEqual([]);
  });

  it('returns empty when no route exists (full wall)', () => {
    const mask = maskFromAscii(['....', '####', '####', '....']);
    const path = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path).toEqual([]);
  });

  it('is deterministic: same inputs produce identical waypoints', () => {
    const mask = maskFromAscii(['....', '.##.', '....', '....']);
    const a = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    const b = findPath(mask, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(a).toEqual(b);
  });

  it('caps iterations to avoid runaway searches', () => {
    expect(ASTAR_ITERATION_CAP).toBe(5000);
  });
});
