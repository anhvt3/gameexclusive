/**
 * LearningObjectAdapter — AP v1.1 Section 5 + ISP v1.1 Step 3
 *
 * Phase 1: loads learning objects from local mock JSON files bundled via Vite glob.
 * Phase 3: will replace with live Supham API fetch, same public signature.
 *
 * HARNESS:
 *   - Only entry point to LO data. No other module parses raw JSON.
 *   - All returned objects are Zod-validated at module load time — fail-fast on schema drift.
 */

import {
  LearningObjectListResponseSchema,
  type LearningObject,
  type Grade,
} from './LearningObjectSchema';

type MockFileModule = { default: unknown };

const mockModules = import.meta.glob<MockFileModule>('../mocks/learningObjects/*.json', {
  eager: true,
});

/**
 * Validated registry — built once at module load.
 * Throws synchronously if any mock file violates schema → prevents ship of bad data.
 */
const ALL_LOS: LearningObject[] = (() => {
  const out: LearningObject[] = [];
  for (const [path, mod] of Object.entries(mockModules)) {
    const parsed = LearningObjectListResponseSchema.safeParse(mod.default);
    if (!parsed.success) {
      throw new Error(
        `[LearningObjectAdapter] Mock file "${path}" failed validation:\n${parsed.error.message}`
      );
    }
    out.push(...parsed.data.list);
  }
  return out;
})();

/**
 * Filter LOs by quiz_type_id + grade.
 *
 * @param quizTypeId  1 | 3 | 8 in Phase 1
 * @param grade       G1-G12
 * @returns           matching LOs (empty array if none)
 */
export function loadMockLOs(quizTypeId: number, grade: Grade): LearningObject[] {
  return ALL_LOS.filter((lo) => lo.quiz_type_id === quizTypeId && lo.grade_name === grade);
}

/** Total count — for diagnostics / test sanity */
export function getMockLOCount(): number {
  return ALL_LOS.length;
}
