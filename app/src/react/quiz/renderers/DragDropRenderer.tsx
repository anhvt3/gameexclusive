/**
 * DragDropRenderer — ISP v1.1 Step 6
 *
 * Renders quiz_type_id=8. Phase 1 implementation uses click-to-assign
 * (pool item → click, zone → click) for reliable headless testing.
 * Future Phase 4: HTML5 native drag-drop + touch support.
 *
 * State:
 *   assignments: itemId → zoneId (null = still in pool)
 *
 * Validation:
 *   For each zone: items assigned must match zone.correct_items (set equality).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragDropLO } from '@data/supham/LearningObjectSchema';

export type DragDropResult = {
  perZone: boolean[];
  isCorrect: boolean;
  timeSpent: number;
};

interface Props {
  lo: DragDropLO;
  onSubmit: (result: DragDropResult) => void;
}

export function DragDropRenderer({ lo, onSubmit }: Props) {
  const mountedAt = useRef(0);
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(lo.draggable_items.map((it) => [it.id, null]))
  );
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const allAssigned = useMemo(
    () => Object.values(assignments).every((z) => z !== null),
    [assignments]
  );

  const handleItemClick = (itemId: string) => {
    if (submitted) return;
    // Click pool item (not yet assigned) → select
    if (assignments[itemId] === null) {
      setSelectedItem((cur) => (cur === itemId ? null : itemId));
      return;
    }
    // Click assigned item → return to pool
    setAssignments((prev) => ({ ...prev, [itemId]: null }));
    setSelectedItem(null);
  };

  const handleZoneClick = (zoneId: string) => {
    if (submitted || !selectedItem) return;
    const zone = lo.drop_zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const currentCount = Object.values(assignments).filter((z) => z === zoneId).length;
    if (currentCount >= zone.capacity) return;
    setAssignments((prev) => ({ ...prev, [selectedItem]: zoneId }));
    setSelectedItem(null);
  };

  const handleSubmit = () => {
    if (submitted || !allAssigned) return;
    setSubmitted(true);
    const perZone = lo.drop_zones.map((zone) => {
      const assignedItems = Object.entries(assignments)
        .filter(([, z]) => z === zone.id)
        .map(([itemId]) => itemId);
      if (assignedItems.length !== zone.correct_items.length) return false;
      return zone.correct_items.every((c) => assignedItems.includes(c));
    });
    onSubmit({
      perZone,
      isCorrect: perZone.every(Boolean),
      timeSpent: mountedAt.current === 0 ? 0 : Date.now() - mountedAt.current,
    });
  };

  const poolItems = lo.draggable_items.filter((it) => assignments[it.id] === null);

  return (
    <div className="dd-renderer flex flex-col gap-4">
      <p className="question text-lg font-medium">{lo.question_text}</p>

      {/* Drop zones */}
      <div className="zones grid grid-cols-2 gap-4">
        {lo.drop_zones.map((zone) => {
          const assignedItems = lo.draggable_items.filter((it) => assignments[it.id] === zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => handleZoneClick(zone.id)}
              disabled={submitted || !selectedItem}
              data-testid={`zone-${zone.id}`}
              className="zone flex min-h-24 flex-col gap-2 rounded-lg border-2 border-dashed border-gray-400 p-3 text-left hover:border-blue-500 disabled:cursor-not-allowed"
            >
              <span className="zone-label font-bold">{zone.label}</span>
              <div className="zone-items flex flex-wrap gap-2">
                {assignedItems.map((it) => (
                  <span
                    key={it.id}
                    className="chip rounded bg-blue-100 px-2 py-1 text-sm"
                    data-testid={`assigned-${it.id}`}
                  >
                    {it.text}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pool */}
      <div className="pool flex flex-wrap gap-2 rounded border border-gray-300 p-3">
        <span className="pool-label mr-2 self-center text-sm text-gray-600">Kéo/chọn:</span>
        {poolItems.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => handleItemClick(it.id)}
            disabled={submitted}
            data-testid={`pool-item-${it.id}`}
            className={`pool-item rounded-lg border px-3 py-2 ${
              selectedItem === it.id
                ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-400'
                : 'border-gray-400 hover:bg-gray-50'
            } disabled:opacity-60`}
          >
            {it.text}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allAssigned || submitted}
        className="self-end rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Xác nhận
      </button>
    </div>
  );
}
