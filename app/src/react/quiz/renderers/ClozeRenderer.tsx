/**
 * ClozeRenderer — ISP v1.1 Step 5
 *
 * Renders quiz_type_id=1 (Cloze with text) LOs.
 * Blanks rendered as inline <input>. Submit locks after first click.
 *
 * Validation:
 *   - Trim whitespace
 *   - Compare against all `alternatives[]` entries
 *   - If case_sensitive=false (default), compare toLowerCase
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClozeLO } from '@data/supham/LearningObjectSchema';

export type ClozeResult = {
  perBlank: boolean[];
  isCorrect: boolean;
  timeSpent: number;
};

interface Props {
  lo: ClozeLO;
  onSubmit: (result: ClozeResult) => void;
}

function matches(input: string, alternatives: string[], caseSensitive: boolean): boolean {
  const cleaned = input.trim();
  if (cleaned.length === 0) return false;
  const needle = caseSensitive ? cleaned : cleaned.toLowerCase();
  return alternatives.some((alt) => {
    const target = caseSensitive ? alt : alt.toLowerCase();
    return needle === target;
  });
}

export function ClozeRenderer({ lo, onSubmit }: Props) {
  const mountedAt = useRef(0);
  const [answers, setAnswers] = useState<string[]>(() => lo.blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const caseSensitive = lo.case_sensitive === true;

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const allFilled = useMemo(() => answers.every((a) => a.trim().length > 0), [answers]);

  const handleChange = (index: number, value: string) => {
    setAnswers((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleSubmit = () => {
    if (submitted || !allFilled) return;
    setSubmitted(true);
    const perBlank = lo.blanks.map((blank, i) =>
      matches(answers[i] ?? '', blank.alternatives, caseSensitive)
    );
    onSubmit({
      perBlank,
      isCorrect: perBlank.every(Boolean),
      timeSpent: mountedAt.current === 0 ? 0 : Date.now() - mountedAt.current,
    });
  };

  // Split question_text on blanks like ___(1)___ and interleave inputs
  const parts = lo.question_text.split(/___\(\d+\)___/);

  return (
    <div className="cloze-renderer flex flex-col gap-4">
      <p className="question text-lg leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < lo.blanks.length && (
              <input
                type="text"
                value={answers[i] ?? ''}
                onChange={(e) => handleChange(i, e.target.value)}
                disabled={submitted}
                aria-label={`blank-${i + 1}`}
                className="mx-1 inline-block w-28 rounded border border-gray-400 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                data-testid={`blank-${lo.blanks[i]?.id}`}
              />
            )}
          </span>
        ))}
      </p>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allFilled || submitted}
        className="self-end rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Xác nhận
      </button>
    </div>
  );
}
