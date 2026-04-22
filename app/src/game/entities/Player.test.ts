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
  } as Record<'W' | 'A' | 'S' | 'D', MockKey>;

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
    expect(scene.add.rectangle).toHaveBeenCalledWith(100, 200, 32, 48, 0xd4691e);
  });

  it('constructor attaches physics body', () => {
    expect(scene.physics.add.existing).toHaveBeenCalled();
  });

  it('constructor enables world bounds collision', () => {
    expect(scene._mocks.setCollideWorldBounds).toHaveBeenCalledWith(true);
  });

  it('constructor registers WASD keys', () => {
    expect(scene.input.keyboard.addKeys).toHaveBeenCalledWith('W,A,S,D');
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
