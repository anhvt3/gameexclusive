import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { Player, PLAYER_SPEED } from './Player';

interface MockKey {
  isDown: boolean;
}

function makeMockScene() {
  const setVelocity = vi.fn();
  const setVelocityX = vi.fn();
  const setVelocityY = vi.fn();
  const setCollideWorldBounds = vi.fn();
  const body = { setVelocity, setVelocityX, setVelocityY, setCollideWorldBounds };
  const rectangle = { body, destroy: vi.fn() };
  const keys = {
    W: { isDown: false },
    A: { isDown: false },
    S: { isDown: false },
    D: { isDown: false },
    UP: { isDown: false },
    DOWN: { isDown: false },
    LEFT: { isDown: false },
    RIGHT: { isDown: false },
  } as Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', MockKey>;

  return {
    add: { rectangle: vi.fn().mockReturnValue(rectangle) },
    physics: { add: { existing: vi.fn() } },
    input: { keyboard: { addKeys: vi.fn().mockReturnValue(keys) } },
    _mocks: { setVelocity, setVelocityX, setVelocityY, setCollideWorldBounds, keys, rectangle },
  };
}

describe('Player entity — Step 12', () => {
  let scene: ReturnType<typeof makeMockScene>;
  let player: Player;

  beforeEach(() => {
    scene = makeMockScene();

    player = new Player(scene as any, 100, 200);
  });

  it('constructor creates rectangle at given position', () => {
    expect(scene.add.rectangle).toHaveBeenCalledWith(100, 200, 128, 160, 0xd4691e);
  });

  it('constructor attaches physics body', () => {
    expect(scene.physics.add.existing).toHaveBeenCalled();
  });

  it('constructor enables world bounds collision', () => {
    expect(scene._mocks.setCollideWorldBounds).toHaveBeenCalledWith(true);
  });

  it('constructor registers WASD keys', () => {
    expect(scene.input.keyboard.addKeys).toHaveBeenCalledWith('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  });

  it('update with no keys down → velocity reset to 0,0', () => {
    player.update();
    expect(scene._mocks.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(scene._mocks.setVelocityX).not.toHaveBeenCalled();
    expect(scene._mocks.setVelocityY).not.toHaveBeenCalled();
  });

  it('D key down → setVelocityX(+speed)', () => {
    scene._mocks.keys.D.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityX).toHaveBeenCalledWith(PLAYER_SPEED);
  });

  it('A key down → setVelocityX(-speed)', () => {
    scene._mocks.keys.A.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityX).toHaveBeenCalledWith(-PLAYER_SPEED);
  });

  it('W key down → setVelocityY(-speed)', () => {
    scene._mocks.keys.W.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityY).toHaveBeenCalledWith(-PLAYER_SPEED);
  });

  it('S key down → setVelocityY(+speed)', () => {
    scene._mocks.keys.S.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityY).toHaveBeenCalledWith(PLAYER_SPEED);
  });

  it('diagonal W+D → both axes set', () => {
    scene._mocks.keys.W.isDown = true;
    scene._mocks.keys.D.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityX).toHaveBeenCalledWith(PLAYER_SPEED);
    expect(scene._mocks.setVelocityY).toHaveBeenCalledWith(-PLAYER_SPEED);
  });

  it('opposite keys A+D prioritize A (else-if branch)', () => {
    scene._mocks.keys.A.isDown = true;
    scene._mocks.keys.D.isDown = true;
    player.update();
    expect(scene._mocks.setVelocityX).toHaveBeenCalledWith(-PLAYER_SPEED);
    expect(scene._mocks.setVelocityX).not.toHaveBeenCalledWith(PLAYER_SPEED);
  });

  it('destroy() destroys sprite', () => {
    player.destroy();
    expect(scene._mocks.rectangle.destroy).toHaveBeenCalled();
  });

  it('throws if scene.input.keyboard null', () => {
    const badScene = { ...makeMockScene(), input: { keyboard: null } };

    expect(() => new Player(badScene as any, 0, 0)).toThrow();
  });
});

describe('Player Sprint E — setHairOverlay', () => {
  it('exposes setHairOverlay on the prototype', () => {
    expect(typeof (Player.prototype as any).setHairOverlay).toBe('function');
  });

  it('is a no-op when scene textures lookup unavailable (test mode)', () => {
    const scene = makeMockScene();
    const player = new Player(scene as any, 0, 0);
    expect(() => player.setHairOverlay('hair-male-a')).not.toThrow();
    expect(() => player.setHairOverlay('nonexistent-key')).not.toThrow();
  });

  it('adds a layered sprite when scene.textures.exists returns true', () => {
    const overlaySprite = {
      setDisplaySize: vi.fn(),
      setDepth: vi.fn(),
      destroy: vi.fn(),
    };
    const scene = makeMockScene() as any;
    scene.add.sprite = vi.fn().mockReturnValue(overlaySprite);
    // Constructor probes for player base keys — return false there so it
    // falls through to the rectangle path. Only the hair overlay key exists.
    scene.textures = {
      exists: vi.fn((k: string) => k.startsWith('hair-')),
    };
    const player = new Player(scene, 50, 60);
    // Sprite (rectangle stand-in) keeps default x/y; align them to assert.
    (player as any).sprite.x = 50;
    (player as any).sprite.y = 60;
    player.setHairOverlay('hair-female-c');
    expect(scene.textures.exists).toHaveBeenCalledWith('hair-female-c');
    expect(scene.add.sprite).toHaveBeenCalledWith(50, 60, 'hair-female-c');
    expect(overlaySprite.setDepth).toHaveBeenCalled();
  });

  it('replaces previous hair overlay on subsequent calls', () => {
    const first = { setDisplaySize: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
    const second = { setDisplaySize: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
    const scene = makeMockScene() as any;
    const spriteFn = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    scene.add.sprite = spriteFn;
    scene.textures = {
      exists: vi.fn((k: string) => k.startsWith('hair-')),
    };
    const player = new Player(scene, 0, 0);
    player.setHairOverlay('hair-male-a');
    player.setHairOverlay('hair-male-b');
    expect(first.destroy).toHaveBeenCalled();
    expect(spriteFn).toHaveBeenCalledTimes(2);
  });
});
