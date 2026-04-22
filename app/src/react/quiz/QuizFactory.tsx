/**
 * QuizFactory — ISP v1.1 Step 7
 *
 * Polymorphic dispatch based on lo.quiz_type_id.
 * Phase 1 supports: 3 (MC), 1 (Cloze), 8 (DragDrop).
 * Unsupported types render a visible "chưa hỗ trợ" fallback for debugging.
 *
 * onSubmit type is union of all renderer result types (consumer handles via discrimination).
 */

import type { LearningObject } from '@data/supham/LearningObjectSchema';
import {
  MultipleChoiceRenderer,
  type MultipleChoiceResult,
} from './renderers/MultipleChoiceRenderer';
import { ClozeRenderer, type ClozeResult } from './renderers/ClozeRenderer';
import { DragDropRenderer, type DragDropResult } from './renderers/DragDropRenderer';

export type QuizResult = MultipleChoiceResult | ClozeResult | DragDropResult;

interface Props {
  lo: LearningObject;
  onSubmit: (result: QuizResult) => void;
}

export function QuizFactory({ lo, onSubmit }: Props) {
  switch (lo.quiz_type_id) {
    case 3:
      return <MultipleChoiceRenderer lo={lo} onSubmit={onSubmit} />;
    case 1:
      return <ClozeRenderer lo={lo} onSubmit={onSubmit} />;
    case 8:
      return <DragDropRenderer lo={lo} onSubmit={onSubmit} />;
    default:
      return (
        <div
          role="alert"
          className="quiz-unsupported rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-900"
        >
          <p className="font-bold">⚠️ Loại câu hỏi chưa hỗ trợ</p>
          <p className="text-sm">
            quiz_type_id={(lo as { quiz_type_id: number }).quiz_type_id} — not supported in Phase 1.
          </p>
        </div>
      );
  }
}
