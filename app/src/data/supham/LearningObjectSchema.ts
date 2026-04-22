/**
 * LearningObjectSchema — Zod validation (AP v1.1 Section 5.1 + Appendix D.7)
 *
 * Matches Supham API `GET /api/learning-objects` response.
 * Phase 1 supports 3 quiz types via discriminated union: MC (3), Cloze (1), DragDrop (8).
 *
 * Other quiz_type_id values are rejected at parse time — Phase 2 will extend.
 */

import { z } from 'zod';

/** Grade enum G1-G12 per Appendix D.7 */
export const GradeSchema = z.enum([
  'G1',
  'G2',
  'G3',
  'G4',
  'G5',
  'G6',
  'G7',
  'G8',
  'G9',
  'G10',
  'G11',
  'G12',
]);
export type Grade = z.infer<typeof GradeSchema>;

/** Difficulty "1" | "2" | "3" | "4" | "5" per Supham schema */
export const DifficultySchema = z.enum(['1', '2', '3', '4', '5']);

/** Shared fields across all quiz types */
const BaseFields = z.object({
  id: z.number(),
  learning_object_code: z.string(),
  learning_object_name: z.string(),
  short_name: z.string().optional(),
  grade_name: GradeSchema,
  subject_name: z.string(),
  learning_object_difficulty: z.object({
    learning_object_difficulty_name: DifficultySchema,
  }),
  time_limit_sec: z.number().optional(),
  min_time_sec: z.number().optional(),
  explanation: z.string().optional(),
});

/** Quiz Type 3 — Multiple Choice */
export const MultipleChoiceSchema = BaseFields.extend({
  quiz_type_id: z.literal(3),
  question_text: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correct_option_id: z.string(),
});
export type MultipleChoiceLO = z.infer<typeof MultipleChoiceSchema>;

/** Quiz Type 1 — Cloze with text */
export const ClozeSchema = BaseFields.extend({
  quiz_type_id: z.literal(1),
  question_text: z.string(),
  blanks: z
    .array(
      z.object({
        id: z.number(),
        correct_answer: z.string(),
        alternatives: z.array(z.string()),
        hint: z.string().optional(),
      })
    )
    .min(1),
  case_sensitive: z.boolean().optional(),
});
export type ClozeLO = z.infer<typeof ClozeSchema>;

/** Quiz Type 8 — Drag & Drop */
export const DragDropSchema = BaseFields.extend({
  quiz_type_id: z.literal(8),
  question_text: z.string(),
  drop_zones: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        capacity: z.number(),
        correct_items: z.array(z.string()),
      })
    )
    .min(1),
  draggable_items: z.array(z.object({ id: z.string(), text: z.string() })).min(1),
});
export type DragDropLO = z.infer<typeof DragDropSchema>;

/** Discriminated union — only Phase 1 types accepted */
export const LearningObjectSchema = z.discriminatedUnion('quiz_type_id', [
  MultipleChoiceSchema,
  ClozeSchema,
  DragDropSchema,
]);

export type LearningObject = z.infer<typeof LearningObjectSchema>;

/** Response envelope { total, list } from Supham */
export const LearningObjectListResponseSchema = z.object({
  total: z.number(),
  list: z.array(LearningObjectSchema),
});

export type LearningObjectListResponse = z.infer<typeof LearningObjectListResponseSchema>;
