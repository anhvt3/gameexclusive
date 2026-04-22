/**
 * MultipleChoiceRenderer — ISP v1.1 Step 4
 *
 * Renders quiz_type_id=3 LOs.
 * Props:
 *   lo       — validated MultipleChoice LO (via Zod)
 *   onSubmit — callback fired once when user selects an option
 *
 * Submit locks after first click to prevent double-fire (AP Section 4 edge case).
 * Timer starts at mount, reports timeSpent in milliseconds.
 */

import { useEffect, useRef, useState } from 'react';
import type { MultipleChoiceLO } from '@data/supham/LearningObjectSchema';

export type MultipleChoiceResult = {
  optionId: string;
  isCorrect: boolean;
  timeSpent: number;
};

interface Props {
  lo: MultipleChoiceLO;
  onSubmit: (result: MultipleChoiceResult) => void;
}

export function MultipleChoiceRenderer({ lo, onSubmit }: Props) {
  const mountedAt = useRef(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const handleSelect = (optionId: string) => {
    if (submitted) return;
    setSubmitted(true);
    const now = Date.now();
    onSubmit({
      optionId,
      isCorrect: optionId === lo.correct_option_id,
      timeSpent: mountedAt.current === 0 ? 0 : now - mountedAt.current,
    });
  };

  return (
    <div className="mc-renderer flex flex-col gap-4">
      <p className="question text-lg font-medium">{lo.question_text}</p>
      <div className="options grid grid-cols-2 gap-3">
        {lo.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelect(opt.id)}
            disabled={submitted}
            className="option-btn rounded-lg border border-gray-300 px-4 py-3 text-left hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid={`option-${opt.id}`}
          >
            <span className="option-id mr-2 font-bold">{opt.id.toUpperCase()}.</span>
            <span className="option-text">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
