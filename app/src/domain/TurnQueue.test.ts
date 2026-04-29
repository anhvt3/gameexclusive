import { describe, expect, it } from 'vitest';
import { init, next, isFactionDead } from './TurnQueue';
import type { CombatEntity } from '@/types/combat';

function hero(hp = 100): CombatEntity {
  return {
    id: 'h',
    kind: 'hero',
    faction: 'ally',
    name: 'Hero',
    element: 'Fire',
    level: 1,
    hp,
    maxHp: 100,
    spriteKey: '',
    isCrittable: true,
  };
}
function pet(hp = 60): CombatEntity {
  return {
    id: 'p',
    kind: 'pet',
    faction: 'ally',
    name: 'Pet',
    element: 'Plant',
    level: 1,
    hp,
    maxHp: 60,
    spriteKey: '',
    isCrittable: false,
    petInstanceId: 'i',
    attackPower: 8,
  };
}
function monster(id: string, hp = 40): CombatEntity {
  return {
    id,
    kind: 'monster',
    faction: 'enemy',
    name: 'Mon',
    element: 'Plant',
    level: 1,
    hp,
    maxHp: 40,
    spriteKey: '',
    isCrittable: true,
    monsterDefId: 1,
    attackPower: 10,
    isBoss: false,
  };
}

describe('TurnQueue — Sprint A', () => {
  it('init places hero before pet before monsters', () => {
    const s = init([monster('m1'), pet(), hero()]);
    expect(s.entities[0]!.kind).toBe('hero');
    expect(s.entities[1]!.kind).toBe('pet');
    expect(s.entities[2]!.kind).toBe('monster');
    expect(s.cursor).toBe(0);
    expect(s.generation).toBe(0);
  });

  it('next() returns hero first', () => {
    const s = init([hero(), pet(), monster('m1')]);
    const r = next(s);
    expect(r.actor?.kind).toBe('hero');
    expect(r.state.cursor).toBe(1);
  });

  it('next() rotates through all living entities', () => {
    let s = init([hero(), pet(), monster('m1')]);
    const sequence: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = next(s);
      sequence.push(r.actor!.kind);
      s = r.state;
    }
    expect(sequence).toEqual(['hero', 'pet', 'monster']);
  });

  it('next() skips dead entities', () => {
    const s = init([hero(0), pet(), monster('m1')]);
    const r = next(s);
    expect(r.actor?.kind).toBe('pet');
  });

  it('generation increments after a full pass', () => {
    let s = init([hero(), monster('m1')]);
    s = next(s).state;
    s = next(s).state;
    const r = next(s);
    expect(r.state.generation).toBe(1);
    expect(r.actor?.kind).toBe('hero');
  });

  it('next() returns null when all entities are dead', () => {
    const s = init([hero(0), pet(0), monster('m1', 0)]);
    expect(next(s).actor).toBeNull();
  });

  it('isFactionDead detects ally wipeout', () => {
    const s = init([hero(0), pet(0), monster('m1')]);
    expect(isFactionDead(s, 'ally')).toBe(true);
    expect(isFactionDead(s, 'enemy')).toBe(false);
  });

  it('isFactionDead detects enemy wipeout', () => {
    const s = init([hero(), monster('m1', 0), monster('m2', 0)]);
    expect(isFactionDead(s, 'enemy')).toBe(true);
    expect(isFactionDead(s, 'ally')).toBe(false);
  });

  it('init with single hero returns valid state', () => {
    const s = init([hero()]);
    expect(s.entities).toHaveLength(1);
    expect(next(s).actor?.kind).toBe('hero');
  });

  it('two monsters keep their spawn order', () => {
    const s = init([hero(), monster('m1'), monster('m2')]);
    expect(s.entities[1]!.id).toBe('m1');
    expect(s.entities[2]!.id).toBe('m2');
  });
});
