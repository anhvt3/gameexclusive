/**
 * QuestProgressToast — Sprint D Task 9.
 *
 * Top-right ephemeral notification overlay. Subscribes to QUEST_PROGRESS,
 * looks up the quest in the catalog, and renders a stacked queue of
 * toasts. Each toast auto-dismisses after 2.5s. When progress reaches
 * the quest's target, the toast switches to a "ready to claim" variant.
 *
 * NO Phaser imports — React + bus + SaveState + catalog only.
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { findQuestDef } from '@data/staticConfig/quests';
import type { QuestId } from '@/types/quest';

const TOAST_DURATION_MS = 2500;

interface ToastEntry {
  id: string;
  questId: QuestId;
  progress: number;
  target: number;
  displayNameVi: string;
  ready: boolean;
}

let toastCounter = 0;

export function QuestProgressToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const off = eventBus.on('QUEST_PROGRESS', ({ questId }) => {
      const def = findQuestDef(questId);
      if (!def) return;
      const progress = useSaveState.getState().questProgress[questId] ?? 0;
      const id = `t-${toastCounter++}-${questId}`;
      const entry: ToastEntry = {
        id,
        questId,
        progress,
        target: def.target,
        displayNameVi: def.displayNameVi,
        ready: progress >= def.target,
      };
      setToasts((prev) => [...prev, entry]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    });
    return off;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={`quest-toast-${t.questId}`}
          className={`rounded-lg border-2 px-4 py-2 shadow-lg pointer-events-auto bg-white ${
            t.ready ? 'border-amber-400 animate-pulse' : 'border-slate-300'
          }`}
        >
          <div className="font-semibold text-sm">🎯 {t.displayNameVi}</div>
          <div className="text-xs text-slate-600">
            {t.ready ? '✨ Sẵn sàng nhận thưởng!' : `(${t.progress}/${t.target})`}
          </div>
        </div>
      ))}
    </div>
  );
}
