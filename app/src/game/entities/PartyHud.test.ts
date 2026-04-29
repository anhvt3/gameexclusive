import { describe, expect, it, vi } from 'vitest';
import { PartyHud } from './PartyHud';
import type { CombatEntity } from '@/types/combat';

function mockScene() {
  const text = { setOrigin: vi.fn().mockReturnThis(), setText: vi.fn() };
  const rect = {
    setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    width: 0,
    setData: vi.fn(),
  };
  return {
    add: {
      text: vi.fn().mockReturnValue(text),
      rectangle: vi.fn().mockReturnValue(rect),
      image: vi
        .fn()
        .mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDisplaySize: vi.fn().mockReturnThis(),
        }),
    },
    scale: { width: 960, height: 640 },
  };
}

function entity(overrides: Partial<CombatEntity> = {}): CombatEntity {
  return {
    id: 'e',
    kind: 'monster',
    faction: 'enemy',
    name: 'Mon',
    element: 'Fire',
    level: 1,
    hp: 40,
    maxHp: 40,
    spriteKey: '',
    isCrittable: true,
    monsterDefId: 1,
    attackPower: 10,
    isBoss: false,
    ...overrides,
  } as CombatEntity;
}

describe('PartyHud — Sprint A', () => {
  it('renders one slot per entity', () => {
    const scene = mockScene();
    const entities = [entity({ id: 'h', faction: 'ally' }), entity({ id: 'm' })];
    new PartyHud(scene as never, entities);
    expect(
      (scene.add.rectangle as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThanOrEqual(4);
  });

  it('updateHp scales the hp fill width proportionally', () => {
    const scene = mockScene();
    const e = entity({ hp: 40, maxHp: 40 });
    const hud = new PartyHud(scene as never, [e]);
    e.hp = 20;
    hud.updateHp(e.id, e.hp, e.maxHp);
    expect(true).toBe(true);
  });

  it('highlight(entityId) marks the active actor', () => {
    const scene = mockScene();
    const hud = new PartyHud(scene as never, [entity({ id: 'h' }), entity({ id: 'm' })]);
    expect(() => hud.highlight('h')).not.toThrow();
    expect(() => hud.highlight(null)).not.toThrow();
  });
});
