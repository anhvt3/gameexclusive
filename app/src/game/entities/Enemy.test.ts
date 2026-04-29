import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { Enemy } from './Enemy';
import type { MonsterDef } from '@data/staticConfig/monsters';

const sampleDef: MonsterDef = {
  id: 1,
  codename: 'embershed',
  displayNameVi: 'Đom Đóm Lửa',
  element: 'Fire',
  tier: 'starter',
  baseHp: 40,
  spritePath: '/assets/monsters/embershed_idle_128.png',
  placeholderColor: 0xff6b35,
};

function makeMockScene() {
  const setImmovable = vi.fn();
  const setData = vi.fn();
  const body = { setImmovable };
  const rect = { body, destroy: vi.fn(), setData };
  return {
    add: { rectangle: vi.fn().mockReturnValue(rect) },
    physics: { add: { existing: vi.fn() } },
    _rect: rect,
    _body: body,
  };
}

describe('Enemy entity — Step 13', () => {
  let scene: ReturnType<typeof makeMockScene>;
  let enemy: Enemy;

  beforeEach(() => {
    scene = makeMockScene();

    enemy = new Enemy(scene as any, 150, 250, sampleDef);
  });

  it('constructor creates rectangle with placeholder color', () => {
    expect(scene.add.rectangle).toHaveBeenCalledWith(150, 250, 72, 72, 0xff6b35);
  });

  it('stores MonsterDef reference', () => {
    expect(enemy.def).toBe(sampleDef);
    expect(enemy.monsterId).toBe(1);
  });

  it('initial currentHp = def.baseHp', () => {
    expect(enemy.currentHp).toBe(40);
  });

  it('attaches physics body as immovable', () => {
    expect(scene.physics.add.existing).toHaveBeenCalled();
    expect(scene._body.setImmovable).toHaveBeenCalledWith(true);
  });

  it('stores back-reference via sprite.setData("enemy", this)', () => {
    expect(scene._rect.setData).toHaveBeenCalledWith('enemy', enemy);
  });

  it('destroy() destroys sprite', () => {
    enemy.destroy();
    expect(scene._rect.destroy).toHaveBeenCalled();
  });
});
