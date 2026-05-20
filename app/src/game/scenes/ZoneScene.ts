/**
 * ZoneScene — Sprint B Task 9.
 *
 * Single Phaser scene parameterized by `screen: 'entrance' | 'path'`. One
 * class therefore covers 2 screens × 3 active zones = 6 visual states; the
 * Boss Hall is a separate scene (Task 10).
 *
 * Behaviour (per AP §4.4 / §4.10):
 *   - init({ zoneId, screen }) — Zod-validate; fall back to forest/entrance.
 *   - create()                — render BG, place player at the per-screen
 *                                spawn, persist currentZoneId, on path
 *                                screen spawn 3 wandering monsters and wire
 *                                EXIT_COMBAT cleanup, load walkable mask,
 *                                wire pointer click + advance button.
 *   - advance()               — entrance→path stays in ZoneScene; path→
 *                                BossHallScene with zoneId only.
 *   - handleClick(x, y)       — A* on a 16-px-block downsample of the
 *                                mask; smooth via Bresenham LOS; tween
 *                                player across waypoints at 220 px/s.
 *   - checkMonsterOverlap()   — per-tween-update radius check; first hit
 *                                stops the tween, emits ENTER_COMBAT,
 *                                pauses + launches CombatScene.
 *
 * Layer rule (AP 3.1): pure Phaser scene; MUST NOT import React. Domain
 * pathfinding modules are pure TS and have no Phaser dep — safe to import.
 */

import Phaser from 'phaser';
import { z } from 'zod';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { getZoneByZoneId } from '@/domain/ZoneRegistry';
import { useSaveState } from '@persistence/SaveStateStore';
import { findPath, type Point } from '@/domain/pathfinding/AStar';
import { smoothPath } from '@/domain/pathfinding/waypoints';
import { loadWalkableMaskFromTexture, type WalkableMask } from '@/domain/pathfinding/WalkableMask';
import { ALL_MONSTERS, type MonsterDef } from '@data/staticConfig/monsters';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import type { ZoneDef } from '@/types/zone';

export const ZONE_SCENE_KEY = 'ZoneScene';
export const PLAYER_WALK_SPEED = 220;
export const MONSTER_OVERLAP_RADIUS = 36;
export const PATH_BLOCK_SIZE = 16;

const InitDataSchema = z.object({
  zoneId: z.string(),
  screen: z.enum(['entrance', 'path']),
});

type ScreenKind = 'entrance' | 'path';

const PATH_MONSTER_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 360, y: 480 },
  { x: 640, y: 540 },
  { x: 920, y: 480 },
];

interface ZoneMonster {
  monsterId: number;
  sprite: { x: number; y: number; destroy?: () => void };
}

interface PlayerSpriteLike {
  x: number;
  y: number;
  destroy?: () => void;
}

interface AdvanceButtonLike {
  text?: string;
  setInteractive?: (...a: unknown[]) => unknown;
  on?: (evt: string, cb: () => void) => unknown;
}

interface TweenLike {
  isPlaying?: () => boolean;
  stop?: () => void;
  remove?: () => void;
}

export class ZoneScene extends Phaser.Scene {
  private zoneId: string = 'forest-island';
  private screen: ScreenKind = 'entrance';
  private bgKey: string = '';
  private advanceLabel: string = '';
  private playerSprite: PlayerSpriteLike | null = null;
  private monsters: ZoneMonster[] = [];
  private mask: WalkableMask | null = null;
  private currentTween: TweenLike | null = null;
  private isWalking = false;
  private exitCombatUnsub: Unsubscribe | null = null;
  private paused = false;
  private _lastStartKey: string | null = null;
  private _lastStartData: Record<string, unknown> | null = null;
  // advanceBtn intentionally retained on the scene only via wiring above —
  // we don't keep a field reference because it has no post-create accessors;
  // unit tests trigger advance() via clickAdvanceButton().

  constructor() {
    super(ZONE_SCENE_KEY);
  }

  init(data: unknown): void {
    const parsed = InitDataSchema.safeParse(data);
    if (parsed.success) {
      this.zoneId = parsed.data.zoneId;
      this.screen = parsed.data.screen;
    } else {
      console.error('[ZoneScene] init payload invalid; falling back', parsed.error);
      this.zoneId = 'forest-island';
      this.screen = 'entrance';
    }
  }

  create(): void {
    // Reset per-create state (scene.start re-runs create on the same instance
    // in Phaser, so we cannot rely on field-initializer defaults alone).
    //
    // FIX B-04: also destroy lingering sprites from previous screen. Without
    // this, transitioning entrance→path→bossHall stacks Player + Enemy game
    // objects in the Phaser display list (JS refs get overwritten but the
    // GameObjects persist), producing the "6 wizards" cluster anh reported.
    if (this.playerSprite?.destroy) this.playerSprite.destroy();
    this.playerSprite = null;
    for (const m of this.monsters) m.sprite?.destroy?.();
    this.monsters = [];
    this.mask = null;
    this.currentTween = null;
    this.isWalking = false;
    this.paused = false;
    this._lastStartKey = null;
    this._lastStartData = null;
    this.exitCombatUnsub?.();
    this.exitCombatUnsub = null;

    const zone = getZoneByZoneId(this.zoneId);
    if (!zone) {
      console.error(`[ZoneScene] unknown zoneId="${this.zoneId}"; routing to WorldMapScene`);
      this._lastStartKey = 'WorldMapScene';
      this._lastStartData = null;
      this.scene.start('WorldMapScene');
      return;
    }

    useSaveState.getState().setCurrentZoneId(this.zoneId);

    this.renderBackground(zone);
    this.spawnPlayer(zone);
    if (this.screen === 'path') {
      this.spawnPathMonsters(zone);
      this.exitCombatUnsub = eventBus.on('EXIT_COMBAT', ({ won, monster_id }) => {
        if (won && monster_id != null) {
          this.removeMonsterById(monster_id);
        }
        this.scene.resume();
        this.paused = false;
      });
    }
    this.loadMask(zone);
    this.wireInput();
    this.renderAdvanceButton();
  }

  shutdown(): void {
    this.exitCombatUnsub?.();
    this.exitCombatUnsub = null;
    this.stopCurrentTween();
  }

  // ─── private builders ──────────────────────────────────────────────

  private renderBackground(zone: ZoneDef): void {
    this.bgKey = this.screen === 'entrance' ? zone.bgEntrance : zone.bgPath;
    if (typeof this.add?.image === 'function') {
      const img = this.add.image(640, 360, this.bgKey);
      (img as unknown as { setOrigin?: (x: number, y: number) => unknown }).setOrigin?.(0.5, 0.5);
    }
  }

  private spawnPlayer(zone: ZoneDef): void {
    const spawn = zone.playerSpawn[this.screen];
    // Use Player when scene.input.keyboard is wired (real game); fall back to
    // a plain sprite/rectangle when running under unit-test mocks (no keyboard).
    const kb = (this.input as unknown as { keyboard?: unknown })?.keyboard;
    if (
      kb &&
      typeof (this.physics?.add as unknown as { existing?: unknown })?.existing === 'function'
    ) {
      try {
        const player = new Player(this, spawn.x, spawn.y);
        this.playerSprite = player.sprite as unknown as PlayerSpriteLike;
        return;
      } catch {
        // fall through to lightweight sprite path
      }
    }
    const rect =
      typeof this.add?.rectangle === 'function'
        ? this.add.rectangle(spawn.x, spawn.y, 64, 80, 0xd4691e)
        : null;
    this.playerSprite = (rect as unknown as PlayerSpriteLike) ?? { x: spawn.x, y: spawn.y };
    this.playerSprite.x = spawn.x;
    this.playerSprite.y = spawn.y;
  }

  private spawnPathMonsters(zone: ZoneDef): void {
    const ids = zone.pathMonsters;
    for (let i = 0; i < PATH_MONSTER_POSITIONS.length; i++) {
      const monsterId = ids[i];
      if (monsterId == null) break;
      const def = ALL_MONSTERS.find((m: MonsterDef) => m.id === monsterId);
      const pos = PATH_MONSTER_POSITIONS[i]!;
      let sprite: { x: number; y: number; destroy?: () => void };
      const physicsExisting = (
        this.physics?.add as unknown as {
          existing?: unknown;
        }
      )?.existing;
      if (def && typeof physicsExisting === 'function') {
        try {
          const enemy = new Enemy(this, pos.x, pos.y, def);
          sprite = enemy.sprite as unknown as typeof sprite;
        } catch {
          sprite = this.fallbackMonsterSprite(pos.x, pos.y);
        }
      } else {
        sprite = this.fallbackMonsterSprite(pos.x, pos.y);
      }
      this.monsters.push({ monsterId, sprite });
    }
  }

  private fallbackMonsterSprite(
    x: number,
    y: number
  ): {
    x: number;
    y: number;
    destroy?: () => void;
  } {
    if (typeof this.add?.rectangle === 'function') {
      return this.add.rectangle(x, y, 64, 64, 0xff5555) as unknown as {
        x: number;
        y: number;
        destroy?: () => void;
      };
    }
    return { x, y, destroy: () => {} };
  }

  private loadMask(zone: ZoneDef): void {
    const maskKey = this.screen === 'entrance' ? zone.walkableEntrance : zone.walkablePath;
    try {
      const tex = this.textures?.get?.(maskKey);
      const src = tex?.getSourceImage?.();
      if (!src) {
        this.mask = null;
        return;
      }
      this.mask = loadWalkableMaskFromTexture(src as HTMLImageElement | HTMLCanvasElement);
    } catch {
      this.mask = null;
    }
  }

  private wireInput(): void {
    if (typeof this.input?.on !== 'function') return;
    this.input.on('pointerdown', (p: { worldX: number; worldY: number }) => {
      this.handleClick(p.worldX, p.worldY);
    });
  }

  private renderAdvanceButton(): void {
    this.advanceLabel = this.screen === 'entrance' ? 'Đi vào' : 'Đi tiếp';
    if (typeof this.add?.text !== 'function') return;
    const btn = this.add.text(1180, 660, this.advanceLabel, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#2a5a3acc',
      padding: { x: 12, y: 6 },
    } as unknown as Phaser.Types.GameObjects.Text.TextStyle);
    const btnAny = btn as unknown as AdvanceButtonLike;
    btnAny.setInteractive?.({ useHandCursor: true });
    btnAny.on?.('pointerdown', () => this.advance());
  }

  // ─── core behaviours ───────────────────────────────────────────────

  private removeMonsterById(monsterId: number): void {
    const idx = this.monsters.findIndex((m) => m.monsterId === monsterId);
    if (idx === -1) return;
    const m = this.monsters[idx]!;
    m.sprite.destroy?.();
    this.monsters.splice(idx, 1);
  }

  advance(): void {
    if (this.screen === 'entrance') {
      const data = { zoneId: this.zoneId, screen: 'path' as const };
      this._lastStartKey = ZONE_SCENE_KEY;
      this._lastStartData = data;
      this.scene.restart(data);
    } else {
      const data = { zoneId: this.zoneId };
      this._lastStartKey = 'BossHallScene';
      this._lastStartData = data;
      this.scene.start('BossHallScene', data);
    }
  }

  handleClick(x: number, y: number): void {
    if (!this.mask || !this.playerSprite) return;
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!this.mask.isWalkable(px, py)) return;

    const block = PATH_BLOCK_SIZE;
    const downMask = downsampleMask(this.mask, block);
    const start: Point = {
      x: Math.floor(this.playerSprite.x / block),
      y: Math.floor(this.playerSprite.y / block),
    };
    const goal: Point = { x: Math.floor(x / block), y: Math.floor(y / block) };
    const raw = findPath(downMask, start, goal);
    if (raw.length === 0) return;
    const smooth = smoothPath(raw, downMask);
    const waypoints = smooth.map((c) => ({ x: c.x * block, y: c.y * block }));
    this.startWalk(waypoints);
  }

  startWalk(waypoints: ReadonlyArray<{ x: number; y: number }>): void {
    this.stopCurrentTween();
    if (!this.playerSprite || waypoints.length === 0) return;
    this.isWalking = true;
    this.runSegment(waypoints, 1);
  }

  private runSegment(waypoints: ReadonlyArray<{ x: number; y: number }>, index: number): void {
    if (!this.playerSprite || index >= waypoints.length) {
      this.isWalking = false;
      this.currentTween = null;
      this.stopPlayerAnim();
      return;
    }
    const target = waypoints[index]!;
    const dx = target.x - this.playerSprite.x;
    const dy = target.y - this.playerSprite.y;
    const dist = Math.hypot(dx, dy);
    const duration = dist > 0 ? (dist / PLAYER_WALK_SPEED) * 1000 : 0;

    // B-12: drive walk anim from tween direction. Without this, click-to-walk
    // never calls Player.update() (Phaser doesn't auto-invoke entity update
    // hooks) so the sprite stayed on frame 0 idle "quay đi quay lại" while
    // tween-sliding across the path. Pick the dominant axis: vertical
    // movement plays walk-up/down (looks correct top-down), horizontal
    // plays walk-left/right.
    this.playPlayerAnimForDelta(dx, dy);

    const cfg = {
      targets: this.playerSprite,
      x: target.x,
      y: target.y,
      duration,
      onUpdate: () => this.checkMonsterOverlap(),
      onComplete: () => this.runSegment(waypoints, index + 1),
    };

    if (typeof this.tweens?.add !== 'function') {
      // Test/headless path: no tween system — snap to target and continue.
      this.playerSprite.x = target.x;
      this.playerSprite.y = target.y;
      this.checkMonsterOverlap();
      this.runSegment(waypoints, index + 1);
      return;
    }
    this.currentTween = this.tweens.add(cfg) as unknown as TweenLike;
  }

  /** B-12: pick the appropriate walk anim from a movement delta. */
  private playPlayerAnimForDelta(dx: number, dy: number): void {
    const anims = (this.playerSprite as unknown as {
      anims?: { play: (k: string, ignoreIfPlaying?: boolean) => void };
    })?.anims;
    if (!anims) return;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    let key: string;
    if (absY > absX) key = dy > 0 ? 'walk-down' : 'walk-up';
    else key = dx > 0 ? 'walk-right' : 'walk-left';
    anims.play(key, true);
  }

  /** B-12: stop the walk anim + reset to the idle (down-facing) frame. */
  private stopPlayerAnim(): void {
    const ref = this.playerSprite as unknown as {
      anims?: { stop: () => void };
      setFrame?: (f: number) => void;
    };
    ref?.anims?.stop();
    ref?.setFrame?.(0);
  }

  checkMonsterOverlap(): void {
    if (!this.playerSprite) return;
    for (const m of this.monsters) {
      const dx = this.playerSprite.x - m.sprite.x;
      const dy = this.playerSprite.y - m.sprite.y;
      if (Math.hypot(dx, dy) < MONSTER_OVERLAP_RADIUS) {
        this.triggerCombat(m.monsterId);
        return;
      }
    }
  }

  private triggerCombat(monsterId: number): void {
    this.stopCurrentTween();
    this.isWalking = false;
    this.stopPlayerAnim();
    eventBus.emit('ENTER_COMBAT', { monster_id: monsterId });
    this.scene.pause();
    this.paused = true;
    this.scene.launch('CombatScene', { monsterId });
  }

  private stopCurrentTween(): void {
    const t = this.currentTween;
    if (!t) return;
    try {
      t.stop?.();
      t.remove?.();
    } catch {
      // ignore
    }
    this.currentTween = null;
  }

  // ─── test helpers ──────────────────────────────────────────────────

  getZoneId(): string {
    return this.zoneId;
  }
  getScreen(): ScreenKind {
    return this.screen;
  }
  getBackgroundKey(): string {
    return this.bgKey;
  }
  getAdvanceLabel(): string {
    return this.advanceLabel;
  }
  getPlayerPos(): { x: number; y: number } {
    return { x: this.playerSprite?.x ?? 0, y: this.playerSprite?.y ?? 0 };
  }
  getMonsterCount(): number {
    return this.monsters.length;
  }
  isPlayerWalking(): boolean {
    return this.isWalking;
  }
  wasPaused(): boolean {
    return this.paused;
  }
  lastSceneStartKey(): string | null {
    return this._lastStartKey;
  }
  lastSceneStartData(): Record<string, unknown> | null {
    return this._lastStartData;
  }

  /** Replace mask with a fully-walkable surrogate (test-only). */
  simulateMaskAllWalkable(): void {
    this.mask = {
      width: 1280,
      height: 720,
      isWalkable: () => true,
    };
  }

  /** Replace mask with a fully-blocked surrogate (test-only). */
  simulateMaskAllBlocked(): void {
    this.mask = {
      width: 1280,
      height: 720,
      isWalkable: () => false,
    };
  }

  simulateClickAt(p: { x: number; y: number }): void {
    this.handleClick(p.x, p.y);
  }

  simulateMonsterCollision(index: number): void {
    const m = this.monsters[index];
    if (!m || !this.playerSprite) return;
    this.playerSprite.x = m.sprite.x;
    this.playerSprite.y = m.sprite.y;
    this.checkMonsterOverlap();
  }

  clickAdvanceButton(): void {
    this.advance();
  }
}

// ─── helpers ─────────────────────────────────────────────────────────

/**
 * Downsample a per-pixel walkable mask to a coarse grid where each cell
 * counts walkable iff the *center pixel* of the corresponding `block × block`
 * patch is walkable in the original mask. Wrapping the source mask in a
 * lightweight WalkableMask keeps the AStar / smoothPath algorithms unchanged.
 */
function downsampleMask(src: WalkableMask, block: number): WalkableMask {
  const cols = Math.floor(src.width / block);
  const rows = Math.floor(src.height / block);
  const half = Math.floor(block / 2);
  return {
    width: cols,
    height: rows,
    isWalkable(cx: number, cy: number): boolean {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
      return src.isWalkable(cx * block + half, cy * block + half);
    },
  };
}
