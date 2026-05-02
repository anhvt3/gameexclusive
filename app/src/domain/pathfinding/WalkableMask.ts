/**
 * Walkable mask reader for Sprint B point-and-click pathfinding.
 *
 * Source: 1-bit B/W PNG painted by Antigravity. Black (#000) = walkable,
 * white (#FFF) = blocked. Anti-aliased edges and partial-alpha pixels
 * are treated as blocked (alpha threshold at 128, luminance threshold
 * at 128).
 */

export interface WalkableMask {
  readonly width: number;
  readonly height: number;
  isWalkable(x: number, y: number): boolean;
}

export function loadWalkableMaskFromImageData(img: ImageData): WalkableMask {
  const { width, height, data } = img;
  const cells = new Uint8Array(width * height);
  for (let i = 0; i < cells.length; i++) {
    const off = i * 4;
    const r = data[off]!;
    const g = data[off + 1]!;
    const b = data[off + 2]!;
    const a = data[off + 3]!;
    const lum = (r + g + b) / 3;
    cells[i] = a >= 128 && lum < 128 ? 1 : 0;
  }
  return {
    width,
    height,
    isWalkable(x: number, y: number): boolean {
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      return cells[y * width + x] === 1;
    },
  };
}

/**
 * Loads a walkable mask from a Phaser texture frame. Browser-only —
 * uses an off-screen canvas + getImageData. In test environments
 * without canvas support, callers should use loadWalkableMaskFromImageData
 * directly with synthesized ImageData.
 */
export function loadWalkableMaskFromTexture(
  source: HTMLImageElement | HTMLCanvasElement
): WalkableMask {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('WalkableMask: 2d context unavailable');
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, source.width, source.height);
  return loadWalkableMaskFromImageData(img);
}
