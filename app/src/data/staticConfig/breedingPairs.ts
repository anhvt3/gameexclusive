// app/src/data/staticConfig/breedingPairs.ts
import type { BreedingPair } from '@/types/breeding';
import type { Element } from '@/types/element';

/**
 * Phase 3 — Element × element → offspring codename matrix (Q6 default).
 *
 * Same-element pairs intentionally NOT here — caller falls back to
 * higher-rarity parent codename (PetBreedingEngine.rollOffspring).
 *
 * Codenames map to STARTER_PETS roster:
 *   bunbleaf (Plant) · pyropup (Fire) · aquakit (Water)
 *   frostfae (Ice) · voltchick (Storm) · terraowl (Earth)
 *
 * Mapping logic: blend yields offspring closest to the dominant
 * element. Sprint C 6-starter roster constrains the codomain.
 */
export const BREEDING_PAIRS: ReadonlyArray<BreedingPair> = [
  { elementA: 'Fire', elementB: 'Water', offspringCodename: 'aquakit' },
  { elementA: 'Fire', elementB: 'Plant', offspringCodename: 'pyropup' },
  { elementA: 'Fire', elementB: 'Ice', offspringCodename: 'voltchick' },
  { elementA: 'Fire', elementB: 'Earth', offspringCodename: 'terraowl' },
  { elementA: 'Fire', elementB: 'Storm', offspringCodename: 'voltchick' },
  { elementA: 'Water', elementB: 'Plant', offspringCodename: 'bunbleaf' },
  { elementA: 'Water', elementB: 'Ice', offspringCodename: 'frostfae' },
  { elementA: 'Water', elementB: 'Earth', offspringCodename: 'aquakit' },
  { elementA: 'Water', elementB: 'Storm', offspringCodename: 'voltchick' },
  { elementA: 'Plant', elementB: 'Ice', offspringCodename: 'frostfae' },
  { elementA: 'Plant', elementB: 'Earth', offspringCodename: 'terraowl' },
  { elementA: 'Plant', elementB: 'Storm', offspringCodename: 'voltchick' },
  { elementA: 'Ice', elementB: 'Earth', offspringCodename: 'frostfae' },
  { elementA: 'Ice', elementB: 'Storm', offspringCodename: 'voltchick' },
  { elementA: 'Earth', elementB: 'Storm', offspringCodename: 'terraowl' },
];

export function lookupPair(a: Element, b: Element): BreedingPair | null {
  return (
    BREEDING_PAIRS.find(
      (p) => (p.elementA === a && p.elementB === b) || (p.elementA === b && p.elementB === a)
    ) ?? null
  );
}
