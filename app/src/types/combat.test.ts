import { describe, expect, it } from 'vitest';
import type { CombatEntity, HeroEntity, PetEntity, MonsterEntity } from './combat';

describe('CombatEntity tag union', () => {
  it('hero entity has kind=hero faction=ally', () => {
    const hero: HeroEntity = {
      id: 'hero-1',
      kind: 'hero',
      faction: 'ally',
      name: 'Wizard',
      element: 'Fire',
      level: 5,
      hp: 100,
      maxHp: 100,
      spriteKey: 'base_player_male',
      isCrittable: true,
    };
    expect(hero.kind).toBe('hero');
    expect(hero.faction).toBe('ally');
  });

  it('pet entity has petInstanceId + attackPower', () => {
    const pet: PetEntity = {
      id: 'pet-1',
      kind: 'pet',
      faction: 'ally',
      name: 'Bunbleaf',
      element: 'Plant',
      level: 3,
      hp: 60,
      maxHp: 60,
      spriteKey: 'pet_bunbleaf_idle',
      isCrittable: false,
      petInstanceId: 'inst_abc',
      attackPower: 8,
    };
    expect(pet.petInstanceId).toBe('inst_abc');
  });

  it('monster entity has monsterDefId + isBoss', () => {
    const monster: MonsterEntity = {
      id: 'mon-1',
      kind: 'monster',
      faction: 'enemy',
      name: 'Embershed',
      element: 'Fire',
      level: 1,
      hp: 40,
      maxHp: 40,
      spriteKey: 'monster_embershed_idle',
      isCrittable: true,
      monsterDefId: 1,
      attackPower: 10,
      isBoss: false,
    };
    expect(monster.monsterDefId).toBe(1);
    expect(monster.isBoss).toBe(false);
  });

  it('CombatEntity union allows narrowing via kind', () => {
    const e: CombatEntity = {
      id: 'x',
      kind: 'hero',
      faction: 'ally',
      name: 'X',
      element: 'Fire',
      level: 1,
      hp: 1,
      maxHp: 1,
      spriteKey: 'k',
      isCrittable: true,
    };
    if (e.kind === 'hero') {
      expect(e.faction).toBe('ally');
    } else {
      throw new Error('should narrow to hero');
    }
  });
});
