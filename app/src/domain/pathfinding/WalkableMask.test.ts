import { describe, expect, it } from 'vitest';
import { loadWalkableMaskFromImageData } from './WalkableMask';

function makeImageData(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('WalkableMask', () => {
  it('treats fully-black pixels as walkable, white as blocked', () => {
    const img = makeImageData(4, 4, (x) => (x < 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const mask = loadWalkableMaskFromImageData(img);
    expect(mask.isWalkable(0, 0)).toBe(true);
    expect(mask.isWalkable(1, 1)).toBe(true);
    expect(mask.isWalkable(2, 0)).toBe(false);
    expect(mask.isWalkable(3, 3)).toBe(false);
  });

  it('treats alpha < 128 as blocked regardless of RGB', () => {
    const img = makeImageData(2, 1, (x) => (x === 0 ? [0, 0, 0, 50] : [0, 0, 0, 200]));
    const mask = loadWalkableMaskFromImageData(img);
    expect(mask.isWalkable(0, 0)).toBe(false);
    expect(mask.isWalkable(1, 0)).toBe(true);
  });

  it('treats out-of-bounds coords as blocked', () => {
    const img = makeImageData(2, 2, () => [0, 0, 0, 255]);
    const mask = loadWalkableMaskFromImageData(img);
    expect(mask.isWalkable(-1, 0)).toBe(false);
    expect(mask.isWalkable(0, -1)).toBe(false);
    expect(mask.isWalkable(2, 0)).toBe(false);
    expect(mask.isWalkable(0, 2)).toBe(false);
  });

  it('reports the correct width and height', () => {
    const img = makeImageData(7, 5, () => [0, 0, 0, 255]);
    const mask = loadWalkableMaskFromImageData(img);
    expect(mask.width).toBe(7);
    expect(mask.height).toBe(5);
  });
});
