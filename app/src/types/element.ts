/**
 * Element type — shared across layers (data, game, domain).
 * Lives in types/ so data layer can reference without importing game logic.
 */

export const ELEMENTS = [
  'Fire',
  'Water',
  'Earth',
  'Ice',
  'Storm',
  'Plant',
  'Shadow',
  'Astral',
] as const;

export type Element = (typeof ELEMENTS)[number];
