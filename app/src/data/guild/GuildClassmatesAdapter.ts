/**
 * GuildClassmatesAdapter — ISP v1.1 Step 22.5.
 *
 * Loads the static Phase 1 class roster for the guild leaderboard.
 * Phase 5 will replace this with a live Supham class-service call;
 * the public shape stays the same.
 *
 * Entry is Zod-validated at module load so malformed mocks fail loud.
 */

import { z } from 'zod';
import classmatesG5 from '../mocks/guild/classmates_g5.json';

export const GuildStudentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  weekly_exp: z.number().int().nonnegative(),
  avatar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const GuildClassSchema = z.object({
  class_name: z.string().min(1),
  grade: z.string(),
  week_start_iso: z.string(),
  current_student_id: z.number().int().positive(),
  students: z.array(GuildStudentSchema).length(30),
});

export type GuildStudent = z.infer<typeof GuildStudentSchema>;
export type GuildClass = z.infer<typeof GuildClassSchema>;

const PARSED_G5 = GuildClassSchema.parse(classmatesG5);

/** Return the class roster for the given grade. Phase 1 ships G5 only. */
export function loadGuildClass(grade: string): GuildClass | null {
  if (grade === 'G5') return PARSED_G5;
  return null;
}

/**
 * Sort students by weekly_exp descending; ties broken by id ascending
 * so ordering is deterministic across renders.
 */
export function sortByWeeklyExp(students: readonly GuildStudent[]): GuildStudent[] {
  return [...students].sort((a, b) => {
    if (b.weekly_exp !== a.weekly_exp) return b.weekly_exp - a.weekly_exp;
    return a.id - b.id;
  });
}
