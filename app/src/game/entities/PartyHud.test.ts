import { describe, expect, it, vi } from 'vitest';
import { PartyHud } from './PartyHud';
import type { CombatEntity } from '@/types/combat';

function mockScene() {
  const text = { setOrigin: vi.fn().mockReturnThis(), setText: vi.fn() };
  const makeRect = () => ({
    setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    width: 0,
    fillColor: 0,
    setData: vi.fn(),
    destroy: vi.fn(),
  });
  return {
    add: {
      text: vi.fn().mockReturnValue(text),
      rectangle: vi.fn().mockImplementation((_x: number, _y: number, w: number) => {
        const r = makeRect();
        r.width = w;
        return r;
      }),
      image: vi.fn().mockReturnValue({
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
    // Find the hpFill rectangle returned by add.rectangle (second .mockReturnValue
    // call per slot — bg first, hpFill second, highlightRing third).
    // We just track that the hpFill width was mutated by updateHp.
    const rectangles = (scene.add.rectangle as ReturnType<typeof vi.fn>).mock.results.map(
      (r) => r.value
    );
    // 3 rectangles per slot: bg, hpFill, highlightRing. Find the hpFill — it's the
    // one whose width starts at HP_BAR_W (200) per the buildSlot order.
    const hpFill = rectangles.find((r) => r.width === 200);
    expect(hpFill).toBeDefined();
    e.hp = 20;
    hud.updateHp(e.id, e.hp, e.maxHp);
    // After updating hp from 40 → 20 (50%), width should drop to 100
    expect(hpFill!.width).toBe(100);
    // And fillColor should switch to yellow (0xfbc02d) since 0.5 is in (0.3, 0.6]
    expect(hpFill!.fillColor).toBe(0xfbc02d);
  });

  it('highlight(entityId) marks the active actor', () => {
    const scene = mockScene();
    const hud = new PartyHud(scene as never, [entity({ id: 'h' }), entity({ id: 'm' })]);
    expect(() => hud.highlight('h')).not.toThrow();
    expect(() => hud.highlight(null)).not.toThrow();
  });
});
