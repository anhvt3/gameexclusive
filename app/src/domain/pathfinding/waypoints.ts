import type { Point } from './AStar';
import type { WalkableMask } from './WalkableMask';

/**
 * Smooth a raw cell-aligned A* path by greedily skipping intermediate
 * waypoints whose line-of-sight to a later waypoint stays walkable.
 *
 * Algorithm:
 *   anchor = path[0]
 *   for i in 2..N-1:
 *     if LOS(anchor → path[i]) blocked → push path[i-1]; anchor = path[i-1]
 *   push final
 *
 * LOS check uses Bresenham sampling — every cell on the line from
 * anchor to candidate must be walkable.
 */
export function smoothPath(raw: ReadonlyArray<Point>, mask: WalkableMask): ReadonlyArray<Point> {
  if (raw.length <= 2) return [...raw];
  const out: Point[] = [raw[0]!];
  let anchor = raw[0]!;
  for (let i = 2; i < raw.length; i++) {
    if (!hasLineOfSight(anchor, raw[i]!, mask)) {
      out.push(raw[i - 1]!);
      anchor = raw[i - 1]!;
    }
  }
  out.push(raw[raw.length - 1]!);
  return out;
}

function hasLineOfSight(a: Point, b: Point, mask: WalkableMask): boolean {
  let x0 = a.x,
    y0 = a.y;
  const x1 = b.x,
    y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (!mask.isWalkable(x0, y0)) return false;
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}
