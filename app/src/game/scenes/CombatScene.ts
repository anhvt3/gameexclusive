/**
 * CombatScene — ISP v1.1 Steps 14 / 16 / 17
 *
 * Step 14: static layout + HP bars.
 * Step 16: FSM + EventBus wiring — spell buttons emit OPEN_QUIZ, QUIZ_RESULT
 *   drives FSM + scene pause/resume.
 * Step 17: full damage resolution —
 *   - QUIZ_CORRECT → ElementSystem.calculateDamage → monster HP mutation →
 *     VICTORY (emit EXIT_COMBAT, gain EXP, stop scene) or MONSTER_TURN.
 *   - QUIZ_WRONG or survived RESOLVE → monster retaliates flat damage to
 *     player HP → DEFEAT (emit EXIT_COMBAT, respawn) or PLAYER_TURN.
 *
 * Launched via scene.launch('CombatScene', {monsterId}) from WorldScene.
 */

import Phaser from 'phaser';
import { findMonsterById, type MonsterDef } from '@data/staticConfig/monsters';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { nextCombatState, isTerminal, type CombatState } from '@game/systems/CombatStateMachine';
import { getWeaknessElement } from '@game/systems/ElementSystem';
import { loadMockLOs } from '@data/supham/LearningObjectAdapter';
import type { LearningObject, Grade } from '@data/supham/LearningObjectSchema';
import type { Element } from '@/types/element';
import { BOSS_HP_SCALE, BOSS_VICTORY_EXP } from '@domain/BossQuest';
import { rollDrop } from '@domain/LevelUpReward';
import { computeEffectiveStats } from '@domain/EffectiveStats';
import { ITEM_REGISTRY } from '@data/staticConfig/items';
import type { InventoryItem } from '@/types/item';
import { HpBar } from '../entities/HpBar';
import { PlayerAvatar } from '../entities/PlayerAvatar';
import { wireSpellVfx } from '@game/systems/SpellVfx';
import { audioManager } from '@/utils/AudioManager';
import type { CombatEntity, HeroEntity, MonsterEntity, PetEntity } from '@/types/combat';
import { PLAYER_NAME_PLACEHOLDER } from '@/types/identity';
import { buildPetEntity } from '@domain/PetEntityFactory';
import { maybeOfferPetRescue } from '@domain/PetRescue';
import { findPetDef } from '@data/staticConfig/pets';
import { PartyHud } from '../entities/PartyHud';
import { PetSprite } from '../entities/PetSprite';
import { init as turnQueueInit, isFactionDead, type TurnQueueState } from '@domain/TurnQueue';
import { resolveHeroSpell, resolvePetAttack, resolveMonsterAttack } from '@domain/CombatResolver';

/**
 * Combat RNG seam — tests swap this via __setCombatRng so crit-chance
 * rolls stay deterministic without leaking scene internals.
 */
let _combatRng: () => number = Math.random;
export function __setCombatRng(fn: () => number): void {
  _combatRng = fn;
}
export function __resetCombatRng(): void {
  _combatRng = Math.random;
}

export const COMBAT_SCENE_KEY = 'CombatScene';

interface CombatSceneData {
  monsterId: number;
}

interface SpellDef {
  id: string;
  label: string;
  color: number;
  element: Element;
  basePower: number;
}

// All 8 elements available so any monster's weakness has a counter spell.
// Without this, kids who walked into Storm-element Voltee got stuck — only
// Earth defeats Storm, and Earth wasn't in the spell list. Now every
// starter monster (Fire/Water/Plant/Ice/Storm) has a clear pick from
// the "Yếu: …" hint shown on the HP strip.
const SPELLS: readonly SpellDef[] = [
  { id: 'fire_blast', label: 'Fire', color: 0xff6633, element: 'Fire', basePower: 12 },
  { id: 'water_jet', label: 'Water', color: 0x3399ff, element: 'Water', basePower: 12 },
  { id: 'plant_whip', label: 'Plant', color: 0x66cc66, element: 'Plant', basePower: 12 },
  { id: 'ice_shard', label: 'Ice', color: 0x99ddff, element: 'Ice', basePower: 12 },
  { id: 'earth_smash', label: 'Earth', color: 0x8b6f3a, element: 'Earth', basePower: 12 },
  { id: 'storm_bolt', label: 'Storm', color: 0xc77dff, element: 'Storm', basePower: 12 },
  { id: 'astral_ray', label: 'Astral', color: 0xfff099, element: 'Astral', basePower: 12 },
  { id: 'shadow_pulse', label: 'Shadow', color: 0x6b4f8a, element: 'Shadow', basePower: 12 },
] as const;

// Phase 1 simplification: flat monster attack power. Phase 2 will use a
// monster.attackPower field + element-typed resolution vs player spell element.
const MONSTER_BASE_POWER = 10;

// Spawn respawn coords = WorldScene center (MAP_COLS/2 * TILE_SIZE, MAP_ROWS/2 * TILE_SIZE).
// Duplicated here to avoid cross-scene import; Step 21 main-menu router will consolidate.
const RESPAWN_X = 480;
const RESPAWN_Y = 320;

// TODO Step 18: read student grade from SaveState / profile.
const DEFAULT_GRADE: Grade = 'G5';
const DEFAULT_QUIZ_TYPE_ID = 3; // multiple choice

export class CombatScene extends Phaser.Scene {
  private monsterDef: MonsterDef | null = null;
  private monsterCurrentHp = 0;
  private monsterMaxHp = 0;
  private playerAvatar: PlayerAvatar | null = null;
  // Step 22.13 — cached actor positions so onSpellClick can emit CAST_SPELL
  // with origin/target without re-deriving them.
  private playerPos = { x: 0, y: 0 };
  private monsterPos = { x: 0, y: 0 };
  private spellVfxUnsub: Unsubscribe | null = null;
  private playerHpBar: HpBar | null = null;
  private monsterHpBar: HpBar | null = null;
  private saveStateUnsub: (() => void) | null = null;

  private combatState: CombatState = 'INIT';
  private selectedSpellId: string | null = null;
  private activeLo: LearningObject | null = null;
  private quizResultUnsub: Unsubscribe | null = null;

  // Sprint A Task 13a — entity array data model (legacy fields stay for Phase 1
  // test compatibility; Task 13b wires TurnQueue + Resolver against entities[])
  private entities: CombatEntity[] = [];
  private partyHud: PartyHud | null = null;
  private petSprite: PetSprite | null = null;
  // Sprint A Task 13b — multi-actor turn queue + target picker
  private turnQueue: TurnQueueState | null = null;
  private selectedTargetId: string | null = null;

  constructor() {
    super(COMBAT_SCENE_KEY);
  }

  init(data: CombatSceneData): void {
    this.monsterDef = findMonsterById(data.monsterId) ?? null;
    // Boss monsters (AP Appendix A tier='boss', is_boss flag) get 5× HP —
    // ISP Step 22.6 daily-challenge scaling.
    const scale = this.monsterDef?.is_boss ? BOSS_HP_SCALE : 1;
    this.monsterMaxHp = (this.monsterDef?.baseHp ?? 0) * scale;
    this.monsterCurrentHp = this.monsterMaxHp;
    this.combatState = 'INIT';
    this.selectedSpellId = null;
    this.activeLo = null;
  }

  create(): void {
    if (!this.monsterDef) {
      this.add
        .text(640, 360, 'Combat error: monster not found', {
          fontSize: '24px',
          color: '#ff5555',
        })
        .setOrigin(0.5);
      return;
    }

    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, 'bg_combat_forest').setDisplaySize(width, height);

    const monsterX = width * 0.28;
    const monsterY = height * 0.55;
    this.monsterPos = { x: monsterX, y: monsterY };
    // Antigravity delivered monster textures at wildly different native
    // sizes (180-1024 px). Normalize to a ~200 px combat display so a
    // 1024-px Voltee doesn't dwarf a 180-px Embershed.
    this.add
      .image(monsterX, monsterY, `monster_${this.monsterDef.codename}_idle`)
      .setDisplaySize(220, 200);
    this.add
      .text(monsterX, monsterY - 90, this.monsterDef.displayNameVi, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    // Step 22.16 — weakness hint under HP bar so kids see which element
    // beats the monster. Real per-element icon crops land Phase 2.
    const weakness = getWeaknessElement(this.monsterDef.element);
    this.add
      .text(monsterX, monsterY + 110, `Yếu: ${weakness}`, {
        fontSize: '13px',
        color: '#ffe39a',
        fontStyle: 'italic',
        backgroundColor: '#00000060',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setData('testid', 'weakness-label');

    const playerX = width * 0.72;
    const playerY = height * 0.55;
    this.playerPos = { x: playerX, y: playerY };
    // Step 22.12 — layered base body + equipment overlays. Replaces the
    // old single wizard_walk sprite so equipping items in /inventory
    // shows up on the actual character mid-combat.
    // Antigravity delivered 1024×1024 base + equipment textures (Appendix
    // I §1.1 originally specced 32-base, but real assets shipped 32× larger
    // for Retina). Use 0.18 so the rendered avatar is ~184 px tall — fits
    // alongside the monster on the 648-wide combat viewport.
    this.playerAvatar = new PlayerAvatar(this, playerX, playerY, 0.18);

    const state = useSaveState.getState();
    // AP §11.3 / Step 22.10 — player bar reads effective max (base + equip maxHp).
    const effectiveMax = (s: typeof state) =>
      s.maxHp + computeEffectiveStats(s.equipment, s.inventory, ITEM_REGISTRY).maxHpDelta;
    this.playerHpBar = new HpBar(this, playerX, playerY + 90, state.hp, effectiveMax(state));
    this.monsterHpBar = new HpBar(
      this,
      monsterX,
      monsterY + 90,
      this.monsterCurrentHp,
      this.monsterMaxHp
    );

    this.saveStateUnsub = useSaveState.subscribe((s) => {
      this.playerHpBar?.setHp(s.hp, effectiveMax(s));
    });

    this.combatState = nextCombatState(this.combatState, { type: 'START' });
    this.renderSpellButtons();
    this.quizResultUnsub = eventBus.on('QUIZ_RESULT', ({ correct }) =>
      this.handleQuizResult(correct)
    );
    // Step 22.13 — cosmetic spell VFX listens on bus, animates a beam
    // from player → monster on every CAST_SPELL emit.
    this.spellVfxUnsub = wireSpellVfx(this);
    // Step 22.17 — monster appearance cry once on scene mount. Sits
    // alongside combat_encounter (fired by appLifecycle on ENTER_COMBAT)
    // — different beat: encounter is the bus event, cry is the visual.
    audioManager.playSfx('combat_monster_cry');

    // Sprint A Task 13a — build entity array + party HUD + pet sprite.
    // Legacy fields (monsterCurrentHp, playerHpBar, etc.) stay for Phase 1
    // test compatibility; Task 13b wires TurnQueue against entities[].
    this.entities = this.buildEntities();
    // Sprint A Task 13b — init TurnQueue for multi-actor loop
    this.turnQueue = turnQueueInit(this.entities);
    const pet = this.entities.find((e): e is PetEntity => e.kind === 'pet');
    if (pet) {
      const codenameMatch = pet.spriteKey.match(/^pet_([a-z]+)_idle$/);
      const codename = codenameMatch?.[1];
      if (codename && findPetDef(codename as never)) {
        this.petSprite = new PetSprite(
          this,
          this.playerPos.x - 80,
          this.playerPos.y + 60,
          codename as never
        );
      }
    }
    this.partyHud = new PartyHud(this, this.entities);
  }

  private buildEntities(): CombatEntity[] {
    const save = useSaveState.getState();
    const heroEntity: HeroEntity = {
      id: 'hero',
      kind: 'hero',
      faction: 'ally',
      name: save.playerName ?? PLAYER_NAME_PLACEHOLDER,
      element: 'Fire',
      level: save.level,
      hp: save.hp,
      maxHp: save.maxHp,
      spriteKey: 'base_player_male',
      // isCrittable=false intentionally: per Resolver semantics, this flag is
      // read by attackers to decide whether they may crit THIS entity. Sprint A
      // monsters don't crit yet, but Sprint B will add monster crits — keeping
      // the hero non-crittable here means students can't suddenly take 1.5×
      // hits without an explicit balance pass. Sprint B may flip this on with
      // a new constant.
      isCrittable: false,
    };
    const out: CombatEntity[] = [heroEntity];
    const pet = buildPetEntity(save.active_pet_instance_id, save.ownedPets);
    if (pet) out.push(pet);
    if (this.monsterDef) {
      const scale = this.monsterDef.is_boss ? BOSS_HP_SCALE : 1;
      const maxHp = this.monsterDef.baseHp * scale;
      const monsterEntity: MonsterEntity = {
        id: `monster-${this.monsterDef.id}`,
        kind: 'monster',
        faction: 'enemy',
        name: this.monsterDef.displayNameVi,
        element: this.monsterDef.element,
        level: 1,
        hp: maxHp,
        maxHp,
        spriteKey: `monster_${this.monsterDef.codename}_idle`,
        isCrittable: !this.monsterDef.is_boss,
        monsterDefId: this.monsterDef.id,
        attackPower: MONSTER_BASE_POWER,
        isBoss: !!this.monsterDef.is_boss,
      };
      out.push(monsterEntity);
    }
    return out;
  }

  private renderSpellButtons(): void {
    const { width, height } = this.scale;
    const cols = 4;
    const rows = Math.ceil(SPELLS.length / cols);
    const gap = 10;
    const buttonWidth = Math.min(120, (width - gap * (cols + 1)) / cols);
    const buttonHeight = 44;
    const totalWidth = cols * buttonWidth + (cols - 1) * gap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    const baseY = height - rows * (buttonHeight + gap) - 40;

    SPELLS.forEach((spell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (buttonWidth + gap);
      const y = baseY + row * (buttonHeight + gap);
      const rect = this.add.rectangle(x, y, buttonWidth, buttonHeight, spell.color);
      rect.setStrokeStyle(2, 0xffffff);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onSpellClick(spell.id));
      this.add
        .text(x, y, spell.label, {
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    });

    // Escape hatch — kids who walked into a fight they can't win can bail
    // out and lose 5 HP instead of getting stuck in the loop. Same physics
    // as a defeat exit (respawn at world centre) but keeps current HP.
    const escY = baseY + rows * (buttonHeight + gap) + 6;
    const escRect = this.add.rectangle(width / 2, escY, 160, 32, 0x4a4a4a);
    escRect.setStrokeStyle(2, 0xffffff);
    escRect.setInteractive({ useHandCursor: true });
    escRect.on('pointerdown', () => this.onFleeClick());
    this.add
      .text(width / 2, escY, 'Bỏ chạy (-5 HP)', {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  /** Flee handler — drops 5 HP, exits combat without victory/defeat. */
  private onFleeClick(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const save = useSaveState.getState();
    save.setHp(Math.max(1, save.hp - 5));
    eventBus.emit('EXIT_COMBAT', {
      won: false,
      exp_gained: 0,
      monster_id: this.monsterDef?.id ?? null,
    });
    this.scene.stop();
  }

  /** Public entry point for spell pointerdown (also test-callable). */
  onSpellClick(spellId: string): void {
    if (this.combatState !== 'PLAYER_TURN') return;

    this.selectedSpellId = spellId;
    this.combatState = nextCombatState(this.combatState, { type: 'CLICK_SPELL', spellId });

    const pool = loadMockLOs(DEFAULT_QUIZ_TYPE_ID, DEFAULT_GRADE);
    if (pool.length === 0) {
      console.warn(
        `[CombatScene] No LOs for grade=${DEFAULT_GRADE} qt=${DEFAULT_QUIZ_TYPE_ID}; aborting spell`
      );
      this.combatState = 'PLAYER_TURN';
      this.selectedSpellId = null;
      return;
    }
    this.activeLo = pool[Math.floor(Math.random() * pool.length)]!;

    this.combatState = nextCombatState(this.combatState, { type: 'OPEN_QUIZ' });
    // Step 22.13 — fire cosmetic CAST_SPELL before pause so SpellVfx tween
    // starts visibly while the quiz overlay is still spinning up.
    const spell = SPELLS.find((s) => s.id === spellId);
    if (spell) {
      eventBus.emit('CAST_SPELL', {
        element: spell.element,
        origin: { ...this.playerPos },
        target: { ...this.monsterPos },
      });
    }
    eventBus.emit('OPEN_QUIZ', {
      lo_id: this.activeLo.id,
      monster_id: this.monsterDef?.id ?? null,
    });
    this.scene.pause();
  }

  private handleQuizResult(correct: boolean): void {
    if (this.combatState !== 'QUIZ_GATE') return;

    this.combatState = nextCombatState(this.combatState, {
      type: correct ? 'QUIZ_CORRECT' : 'QUIZ_WRONG',
    });

    if (correct) {
      // state now RESOLVE_DAMAGE — apply player spell damage
      // resolveHeroSpell mutates target.hp; FSM sets VICTORY if remainingHp=0
      this.applyPlayerDamage();

      if (this.combatState === 'VICTORY') {
        this.handleVictory();
        return;
      }

      // Sprint A Task 13b: pet auto-attack acts between hero and monster turns
      const pet = this.entities.find((e) => e.kind === 'pet' && e.hp > 0);
      if (pet) {
        const petTarget = this.lowestHpFromFaction('enemy');
        if (petTarget) {
          resolvePetAttack({ source: pet, target: petTarget, rng: _combatRng });
          this.partyHud?.updateHp(petTarget.id, petTarget.hp, petTarget.maxHp);
          if (
            petTarget.kind === 'monster' &&
            this.monsterDef &&
            petTarget.monsterDefId === this.monsterDef.id
          ) {
            this.monsterCurrentHp = petTarget.hp;
            this.monsterHpBar?.setHp(petTarget.hp, this.monsterMaxHp);
          }
          // Check if pet finished the monster off
          this.__checkEnd();
          // Use isTerminal() to bypass TypeScript's narrowing (which excluded VICTORY above).
          if (isTerminal(this.combatState)) return;
        }
      }
      // else state = MONSTER_TURN — fall through to monster retaliation
    }

    // QUIZ_WRONG (MONSTER_TURN) or survived RESOLVE_DAMAGE → resume + monster attacks
    this.scene.resume();
    this.runMonsterTurn();

    // FSM sets DEFEAT if player hp=0 (via DAMAGE_APPLIED side:'player' remainingHp=0)
    if (this.combatState === 'DEFEAT') {
      this.handleDefeat();
      return;
    }

    // Reset target selection for next PLAYER_TURN
    this.selectedTargetId = null;
  }

  private applyPlayerDamage(): void {
    if (!this.selectedSpellId || !this.activeLo) return;
    const spell = SPELLS.find((s) => s.id === this.selectedSpellId);
    if (!spell) return;

    // Sprint A Task 13b: resolve against locked target or first living enemy
    const target =
      this.entities.find((e) => e.id === this.selectedTargetId && e.hp > 0) ??
      this.lowestHpFromFaction('enemy');
    if (!target) return;

    const difficulty = parseInt(
      this.activeLo.learning_object_difficulty.learning_object_difficulty_name,
      10
    );

    // AP §11.3 CL7 — equipment modifiers: crit roll + per-element damage bump.
    const save = useSaveState.getState();
    const stats = computeEffectiveStats(save.equipment, save.inventory, ITEM_REGISTRY);

    const result = resolveHeroSpell({
      source: this.entities[0]!, // hero is always index 0 in TurnQueue-sorted array
      target,
      spellElement: spell.element,
      spellBasePower: spell.basePower,
      difficulty,
      heroCritChancePct: stats.critChancePct,
      heroSpellDamagePct: stats.spellDamagePct,
      rng: _combatRng,
    });

    // Sync legacy fields for Phase 1 test compatibility
    if (
      target.kind === 'monster' &&
      this.monsterDef &&
      target.monsterDefId === this.monsterDef.id
    ) {
      this.monsterCurrentHp = target.hp;
      this.monsterHpBar?.setHp(target.hp, this.monsterMaxHp);
    }
    // Update PartyHud
    this.partyHud?.updateHp(target.id, target.hp, target.maxHp);

    // Step 22.17 — auditory feedback. damage=0 plays the miss whiff,
    // damage>0 plays the impact thump.
    audioManager.playSfx(result.damage === 0 ? 'combat_miss' : 'combat_hit_impact');
    this.combatState = nextCombatState(this.combatState, {
      type: 'DAMAGE_APPLIED',
      side: 'monster',
      remainingHp: target.hp,
    });
  }

  private runMonsterTurn(): void {
    this.combatState = nextCombatState(this.combatState, { type: 'MONSTER_ACT' });
    this.combatState = nextCombatState(this.combatState, { type: 'HIT_RESOLVED' });

    // Sprint A Task 13b: monster attacks lowest-HP ally via CombatResolver
    const monster = this.entities.find((e) => e.kind === 'monster' && e.hp > 0);
    const allyTarget = this.lowestHpFromFaction('ally');
    if (monster && allyTarget) {
      resolveMonsterAttack({ source: monster, target: allyTarget, rng: _combatRng });
      // Sync legacy HP store for Phase 1 tests
      if (allyTarget.kind === 'hero') {
        useSaveState.getState().setHp(allyTarget.hp);
      }
      this.partyHud?.updateHp(allyTarget.id, allyTarget.hp, allyTarget.maxHp);
    }

    // Step 22.17 — monster's hit on player. Same SFX as player→monster
    // hit (single brand thump), distinct from combat_miss.
    audioManager.playSfx('combat_hit_impact');

    const allyHp = allyTarget?.hp ?? 0;
    this.combatState = nextCombatState(this.combatState, {
      type: 'DAMAGE_APPLIED',
      side: 'player',
      remainingHp: allyHp,
    });
  }

  private handleVictory(): void {
    // Boss victory pays a flat BOSS_VICTORY_EXP (Step 22.6); normal monsters
    // pay their baseHp. After Step 22.8, bosses ALSO grant one guaranteed
    // item on top of any level-up drops the EXP cascade produces.
    const exp = this.monsterDef?.is_boss ? BOSS_VICTORY_EXP : (this.monsterDef?.baseHp ?? 0);
    const monsterId = this.monsterDef?.id ?? null;
    const store = useSaveState.getState();
    store.gainExp(exp);
    if (this.monsterDef?.is_boss) {
      // Guaranteed drop uses the player's NEW level so the reward scales.
      const level = useSaveState.getState().level;
      const dropped = rollDrop({ pool: ITEM_REGISTRY, level });
      if (dropped) {
        const instance: InventoryItem = {
          instanceId:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `inst_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          itemId: dropped.id,
          acquiredAt: Date.now(),
        };
        useSaveState.getState().addInventoryItem(instance);
        eventBus.emit('LEVEL_UP', {
          newLevel: level,
          grantedItemId: dropped.id,
        });
      }
    }
    eventBus.emit('EXIT_COMBAT', {
      won: true,
      exp_gained: exp,
      monster_id: monsterId,
    });
    // Sprint C Task 7 — pet rescue offer (post-EXIT_COMBAT so the React layer
    // sees the combat-over signal first and the rescue overlay layers on top).
    if (this.monsterDef) {
      const offer = maybeOfferPetRescue({
        monster: this.monsterDef,
        rng: _combatRng,
      });
      if (offer) {
        eventBus.emit('PET_RESCUE_OFFERED', {
          petCodename: offer.codename,
          rarity: offer.rarity,
        });
      }
    }
    this.scene.stop();
  }

  /** Sprint A Task 13b: return lowest-HP living entity in a faction (first match tiebreak). */
  private lowestHpFromFaction(faction: 'ally' | 'enemy'): CombatEntity | null {
    const candidates = this.entities.filter((e) => e.faction === faction && e.hp > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((acc, e) => (e.hp < acc.hp ? e : acc));
  }

  private handleDefeat(): void {
    const monsterId = this.monsterDef?.id ?? null;
    const save = useSaveState.getState();
    save.setHp(save.maxHp);
    save.setPosition(RESPAWN_X, RESPAWN_Y);
    eventBus.emit('EXIT_COMBAT', {
      won: false,
      exp_gained: 0,
      monster_id: monsterId,
    });
    this.scene.stop();
  }

  shutdown(): void {
    this.saveStateUnsub?.();
    this.saveStateUnsub = null;
    this.quizResultUnsub?.();
    this.quizResultUnsub = null;
    this.playerHpBar?.destroy();
    this.monsterHpBar?.destroy();
    this.playerHpBar = null;
    this.monsterHpBar = null;
    this.playerAvatar?.destroy();
    this.playerAvatar = null;
    this.spellVfxUnsub?.();
    this.spellVfxUnsub = null;
    this.partyHud?.destroy();
    this.partyHud = null;
    this.petSprite?.destroy();
    this.petSprite = null;
  }

  /** Sprint A Task 13b: lock attack target (test + future UI use). */
  __pickTarget(entityId: string): void {
    this.selectedTargetId = entityId;
  }

  /** Sprint A Task 13b: check faction-death and emit victory/defeat (callable from tests).
   *  Idempotent — if combatState is already terminal, returns without double-handling. */
  __checkEnd(): void {
    if (!this.turnQueue) return;
    if (this.combatState === 'VICTORY' || this.combatState === 'DEFEAT') return;
    if (isFactionDead(this.turnQueue, 'enemy')) {
      this.combatState = 'VICTORY';
      this.handleVictory();
    } else if (isFactionDead(this.turnQueue, 'ally')) {
      this.combatState = 'DEFEAT';
      this.handleDefeat();
    }
  }

  /** Test-only accessors */
  getEntities(): CombatEntity[] {
    return this.entities;
  }
  getMonsterDef(): MonsterDef | null {
    return this.monsterDef;
  }
  getMonsterHp(): number {
    return this.monsterCurrentHp;
  }
  getPlayerHpBar(): HpBar | null {
    return this.playerHpBar;
  }
  getMonsterHpBar(): HpBar | null {
    return this.monsterHpBar;
  }
  getCombatState(): CombatState {
    return this.combatState;
  }
  getSelectedSpellId(): string | null {
    return this.selectedSpellId;
  }
  /** Test-only: force monster HP to a specific value (for setting up VICTORY path). */
  __setMonsterHp(hp: number): void {
    this.monsterCurrentHp = hp;
    if (this.monsterDef) {
      this.monsterHpBar?.setHp(hp, this.monsterMaxHp);
    }
    // Sprint A Task 13b: also sync entity hp so resolveHeroSpell sees correct value
    const monsterEntity = this.entities.find((e) => e.kind === 'monster');
    if (monsterEntity) {
      monsterEntity.hp = hp;
    }
    // Rebuild turnQueue to reflect updated hp in isFactionDead checks
    if (this.turnQueue) {
      this.turnQueue = turnQueueInit(this.entities);
    }
  }

  /** Test-only: effective max HP after boss scaling. */
  getMonsterMaxHp(): number {
    return this.monsterMaxHp;
  }
  /** Test-only: layered avatar handle. */
  getPlayerAvatar(): PlayerAvatar | null {
    return this.playerAvatar;
  }
}
