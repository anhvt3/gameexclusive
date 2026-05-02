import type { WalkableMask } from './WalkableMask';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const ASTAR_ITERATION_CAP = 5000;

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  index: number;
}

const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
  [-1, 0, 10],
  [1, 0, 10],
  [0, -1, 10],
  [0, 1, 10],
  [-1, -1, 14],
  [1, -1, 14],
  [-1, 1, 14],
  [1, 1, 14],
];

function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return 10 * (dx + dy) + (14 - 2 * 10) * Math.min(dx, dy);
}

export function findPath(mask: WalkableMask, start: Point, goal: Point): ReadonlyArray<Point> {
  if (!mask.isWalkable(start.x, start.y)) return [];
  if (!mask.isWalkable(goal.x, goal.y)) return [];
  if (start.x === goal.x && start.y === goal.y) return [start];

  const open: Node[] = [];
  const seen = new Map<string, Node>();
  const closed = new Set<string>();
  let counter = 0;

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    h: octile(start.x, start.y, goal.x, goal.y),
    f: 0,
    parent: null,
    index: counter++,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);
  seen.set(key(start.x, start.y), startNode);

  let iter = 0;
  while (open.length > 0 && iter++ < ASTAR_ITERATION_CAP) {
    open.sort((a, b) => a.f - b.f || a.h - b.h || a.index - b.index);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(current);
    }
    closed.add(key(current.x, current.y));
    for (const [dx, dy, cost] of NEIGHBORS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!mask.isWalkable(nx, ny)) continue;
      // No diagonal corner-cutting through walls
      if (dx !== 0 && dy !== 0) {
        if (!mask.isWalkable(current.x + dx, current.y)) continue;
        if (!mask.isWalkable(current.x, current.y + dy)) continue;
      }
      const k = key(nx, ny);
      if (closed.has(k)) continue;
      const tentativeG = current.g + cost;
      const existing = seen.get(k);
      if (!existing || tentativeG < existing.g) {
        const node: Node = existing ?? {
          x: nx,
          y: ny,
          g: 0,
          h: octile(nx, ny, goal.x, goal.y),
          f: 0,
          parent: null,
          index: counter++,
        };
        node.g = tentativeG;
        node.parent = current;
        node.f = node.g + node.h;
        if (!existing) {
          open.push(node);
          seen.set(k, node);
        }
      }
    }
  }
  return [];
}

function reconstruct(end: Node): ReadonlyArray<Point> {
  const out: Point[] = [];
  let cur: Node | null = end;
  while (cur) {
    out.push({ x: cur.x, y: cur.y });
    cur = cur.parent;
  }
  return out.reverse();
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}
