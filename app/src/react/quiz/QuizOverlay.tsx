/**
 * QuizOverlay — ISP v1.1 Step 8
 *
 * Event-driven React container that:
 *   - Mounts at app root, subscribes to OPEN_QUIZ on mount
 *   - Resolves lo_id → LearningObject via adapter
 *   - Renders QuizFactory fullscreen overlay over Phaser canvas
 *   - On child submit: emits QUIZ_RESULT (includes lo_id) → hides overlay
 *   - Cleanup on unmount (AP 7.4 leak prevention)
 *
 * CSS: fixed inset-0, backdrop blur, centered content. Phase 1 fade defer (CSS-only).
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@bus/EventBus';
import { findLOById } from '@data/supham/LearningObjectAdapter';
import type { LearningObject } from '@data/supham/LearningObjectSchema';
import { audioManager } from '@/utils/AudioManager';
import { QuizFactory, type QuizResult } from './QuizFactory';
import { WhiteboardPad } from './WhiteboardPad';

export function QuizOverlay() {
  const [activeLO, setActiveLO] = useState<LearningObject | null>(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  useEffect(() => {
    const offOpen = eventBus.on('OPEN_QUIZ', ({ lo_id }) => {
      const lo = findLOById(lo_id);
      if (!lo) {
        console.warn(`[QuizOverlay] OPEN_QUIZ received unknown lo_id=${lo_id}`);
        return;
      }
      setActiveLO(lo);
      // Step 22.17 — popup-open SFX paired with the dialog reveal.
      audioManager.playSfx('ui_popup_open');
    });
    // Step 22.14 fix — auto-close when QUIZ_RESULT lands. Covers the path
    // where a non-UI caller (test bridge, future server-validation) emits
    // QUIZ_RESULT directly: without this listener the dialog would stay
    // mounted forever because handleSubmit is the only other close path.
    const offResult = eventBus.on('QUIZ_RESULT', () => {
      setActiveLO(null);
      audioManager.playSfx('ui_popup_close');
    });
    return () => {
      offOpen();
      offResult();
    };
  }, []);

  if (!activeLO) return null;

  const handleSubmit = (result: QuizResult) => {
    const loId = activeLO.id;
    setActiveLO(null);
    // ISP 22.11 — auditory feedback for right/wrong.
    audioManager.playSfx(result.isCorrect ? 'math_correct' : 'math_wrong');
    eventBus.emit('QUIZ_RESULT', {
      correct: result.isCorrect,
      timeSpent: result.timeSpent,
      attempts: 1,
      lo_id: loId,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Câu hỏi"
      className="quiz-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="quiz-panel w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="quiz-header mb-4 flex items-center justify-between gap-3 border-b pb-2">
          <div>
            <span className="subject-tag rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
              {activeLO.subject_name} · {activeLO.grade_name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                audioManager.playSfx('ui_btn_click');
                setWhiteboardOpen((v) => !v);
              }}
              onMouseEnter={() => audioManager.playSfx('ui_btn_hover')}
              aria-pressed={whiteboardOpen}
              data-testid="whiteboard-toggle"
              className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
                whiteboardOpen
                  ? 'border-amber-500 bg-amber-100 text-amber-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              🖊 Nháp
            </button>
            <span className="text-xs text-gray-500">
              Độ khó {activeLO.learning_object_difficulty.learning_object_difficulty_name}/5
            </span>
          </div>
        </div>
        <QuizFactory lo={activeLO} onSubmit={handleSubmit} />
        {whiteboardOpen && (
          <WhiteboardPad resetKey={activeLO.id} onClose={() => setWhiteboardOpen(false)} />
        )}
      </div>
    </div>
  );
}
