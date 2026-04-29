/**
 * WhiteboardPad — ISP v1.1 Step 22.15 / Appendix I §1.4.
 *
 * In-place math scratchpad for the QuizOverlay. Pure 2D canvas; pen +
 * eraser + 4-colour palette + clear button. Pointer events only (mouse
 * + touch); keyboard shortcuts deferred until kids actually ask for
 * them. The `resetKey` prop is the LO id — when it changes the canvas
 * wipes itself so each problem starts on a blank pad.
 *
 * Audio: throttled `math_whiteboard_draw` while the pen is moving so
 * the SFX doesn't spam at >12 fires/sec on a fast stroke.
 */

import { useEffect, useRef, useState } from 'react';
import { useGameAudio } from '@react/shell/useGameAudio';

const PEN_COLORS = ['#1f2937', '#dc2626', '#2563eb', '#16a34a'] as const;
type PenColor = (typeof PEN_COLORS)[number];
type Tool = 'pen' | 'eraser';

const PEN_WIDTH = 3;
const ERASER_WIDTH = 18;
const DRAW_SFX_THROTTLE_MS = 80;

export interface WhiteboardPadProps {
  onClose: () => void;
  /** When this changes, canvas wipes (e.g. new OPEN_QUIZ — fresh problem). */
  resetKey: string | number;
}

export function WhiteboardPad({ onClose, resetKey }: WhiteboardPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastSfxAtRef = useRef(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<PenColor>(PEN_COLORS[0]);
  const { playSfx } = useGameAudio();

  // Wipe on resetKey change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, [resetKey]);

  const beginStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const continueStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();

    const now = Date.now();
    if (now - lastSfxAtRef.current >= DRAW_SFX_THROTTLE_MS) {
      lastSfxAtRef.current = now;
      playSfx('math_whiteboard_draw');
    }
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <section
      role="region"
      aria-label="Bảng nháp toán"
      data-testid="whiteboard-pad"
      className="whiteboard-pad mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2"
    >
      <div className="toolbar mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTool('pen')}
          aria-pressed={tool === 'pen'}
          aria-label="Công cụ bút"
          className={`rounded-md border px-3 py-1 text-sm font-semibold ${
            tool === 'pen' ? 'bg-amber-500 text-white' : 'bg-white text-stone-700'
          }`}
        >
          🖊 Bút
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          aria-pressed={tool === 'eraser'}
          aria-label="Công cụ tẩy"
          className={`rounded-md border px-3 py-1 text-sm font-semibold ${
            tool === 'eraser' ? 'bg-amber-500 text-white' : 'bg-white text-stone-700'
          }`}
        >
          🧽 Tẩy
        </button>
        <div className="ml-2 flex items-center gap-1" role="radiogroup" aria-label="Màu bút">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Màu ${c}`}
              data-testid={`color-${c}`}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={`h-7 w-7 rounded-full border-2 transition ${
                color === c ? 'border-amber-700 ring-2 ring-amber-300' : 'border-stone-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded-md bg-stone-200 px-3 py-1 text-sm font-semibold text-stone-700 hover:bg-stone-300"
          >
            Xóa hết
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng nháp"
            className="rounded-md bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-600 hover:bg-stone-200"
          >
            Đóng
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={260}
        data-testid="whiteboard-canvas"
        onPointerDown={beginStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
        className="block w-full touch-none rounded-md border-2 border-amber-200 bg-white"
        style={{ cursor: tool === 'pen' ? 'crosshair' : 'cell' }}
      />
    </section>
  );
}
