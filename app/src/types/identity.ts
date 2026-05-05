/**
 * Identity & Settings types — Sprint E.
 *
 * Sprint E adds 4 new persisted SaveState fields tracking player
 * identity (name, gender, hair) and a single settings knob (hint
 * difficulty). Audio mute remains in flags.audio_muted (Phase 1.5);
 * tutorial replay reuses TUTORIAL_FLAG.
 */

export type Gender = 'male' | 'female';
export type HairStyle = 'a' | 'b' | 'c' | 'd';
export type HintDifficulty = 'easy' | 'medium' | 'hard';

export const HAIR_STYLES: ReadonlyArray<HairStyle> = ['a', 'b', 'c', 'd'];
export const GENDERS: ReadonlyArray<Gender> = ['male', 'female'];
export const HINT_DIFFICULTIES: ReadonlyArray<HintDifficulty> = ['easy', 'medium', 'hard'];

export const PLAYER_NAME_PLACEHOLDER = 'Khách';

/** Hint visibility probability per quiz card, keyed on difficulty. */
export const HINT_VISIBILITY_PROBABILITY: Readonly<Record<HintDifficulty, number>> = {
  easy: 0.5,
  medium: 0.25,
  hard: 0,
};

/** Tutorial gesture overlay target — declared on TutorialStep. */
export type GestureTarget =
  | { type: 'canvas'; selector: string }
  | { type: 'dom'; selector: string };

/** Phaser scene anchor coordinate registry — populated by scenes at init(). */
export interface SceneAnchorMap {
  [key: string]: { x: number; y: number };
}
