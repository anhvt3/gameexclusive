import { describe, expect, it } from 'vitest';
import { smoothPath } from './waypoints';
import { loadWalkableMaskFromImageData, type WalkableMask } from './WalkableMask';

function openMask(w: number, h: number): WalkableMask {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return loadWalkableMaskFromImageData({
    data,
    width: w,
    height: h,
    colorSpace: 'srgb',
  } as ImageData);
}

describe('smoothPath', () => {
  it('collapses a straight line to endpoints only', () => {
    const mask = openMask(10, 1);
    const raw = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
    expect(smoothPath(raw, mask)).toEqual([
      { x: 0, y: 0 },
      { x: 9, y: 0 },
    ]);
  });

  it('keeps a turn point when LOS is blocked between candidate skip', () => {
    // 5x3 grid with a blocked cell at (2, 0)
    const w = 5,
      h = 3;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const blocked = x === 2 && y === 0;
        const i = (y * w + x) * 4;
        data[i] = blocked ? 255 : 0;
        data[i + 1] = blocked ? 255 : 0;
        data[i + 2] = blocked ? 255 : 0;
        data[i + 3] = 255;
      }
    }
    const mask = loadWalkableMaskFromImageData({
      data,
      width: w,
      height: h,
      colorSpace: 'srgb',
    } as ImageData);
    const raw = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    const smoothed = smoothPath(raw, mask);
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 4, y: 0 });
    expect(smoothed.length).toBeLessThanOrEqual(raw.length);
    expect(smoothed.length).toBeGreaterThanOrEqual(3);
  });

  it('returns input as-is when length <= 2', () => {
    const mask = openMask(4, 4);
    expect(smoothPath([], mask)).toEqual([]);
    expect(smoothPath([{ x: 1, y: 1 }], mask)).toEqual([{ x: 1, y: 1 }]);
    expect(
      smoothPath(
        [
          { x: 0, y: 0 },
          { x: 3, y: 3 },
        ],
        mask
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 3 },
    ]);
  });
});
