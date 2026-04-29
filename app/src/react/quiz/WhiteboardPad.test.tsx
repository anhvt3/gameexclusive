import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhiteboardPad } from './WhiteboardPad';
import { audioManager } from '@/utils/AudioManager';

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

interface MockCtx {
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  lineCap: string;
  lineJoin: string;
  strokeStyle: string;
  lineWidth: number;
}

let lastCtx: MockCtx | null = null;

beforeEach(() => {
  audioManager.__reset();
  // jsdom canvas getContext returns null by default — mock it. The same
  // ctx instance is returned for every call on the same canvas so the
  // test can introspect every draw call across move/up/clear.
  const ctxByCanvas = new WeakMap<HTMLCanvasElement, MockCtx>();
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
    let ctx = ctxByCanvas.get(this);
    if (!ctx) {
      ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        lineCap: '',
        lineJoin: '',
        strokeStyle: '',
        lineWidth: 0,
      };
      ctxByCanvas.set(this, ctx);
    }
    lastCtx = ctx;
    return ctx as unknown as CanvasRenderingContext2D;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  // Stable bounding rect so pointer math is predictable.
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 260,
    width: 600,
    height: 260,
    toJSON: () => ({}),
  })) as never;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function pointer(x: number, y: number) {
  return { clientX: x, clientY: y, pointerType: 'mouse', button: 0 };
}

describe('WhiteboardPad — Step 22.15', () => {
  it('renders toolbar (pen/eraser/4 colors/clear/close) + canvas', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    expect(screen.getByLabelText('Công cụ bút')).toBeInTheDocument();
    expect(screen.getByLabelText('Công cụ tẩy')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Xóa hết/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Đóng bảng nháp')).toBeInTheDocument();
    expect(screen.getByTestId('whiteboard-canvas')).toBeInTheDocument();
  });

  it('pointerdown then pointermove draws (beginPath + moveTo + lineTo + stroke)', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, pointer(10, 20));
    fireEvent.pointerMove(canvas, pointer(30, 40));
    expect(lastCtx!.beginPath).toHaveBeenCalled();
    expect(lastCtx!.moveTo).toHaveBeenCalledWith(10, 20);
    expect(lastCtx!.lineTo).toHaveBeenCalledWith(30, 40);
    expect(lastCtx!.stroke).toHaveBeenCalled();
  });

  it('pointermove with no prior pointerdown does NOT draw', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    fireEvent.pointerMove(canvas, pointer(10, 10));
    expect(lastCtx!.lineTo).not.toHaveBeenCalled();
  });

  it('pointerup ends the stroke (next move does not draw)', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, pointer(0, 0));
    fireEvent.pointerUp(canvas, pointer(0, 0));
    fireEvent.pointerMove(canvas, pointer(100, 100));
    expect(lastCtx!.lineTo).not.toHaveBeenCalledWith(100, 100);
  });

  it('eraser selection swaps strokeStyle to white + thicker lineWidth', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    fireEvent.click(screen.getByLabelText('Công cụ tẩy'));
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, pointer(0, 0));
    expect(lastCtx!.strokeStyle).toBe('#ffffff');
    expect(lastCtx!.lineWidth).toBe(18);
  });

  it('selecting a color flips back to pen tool + uses that color', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    fireEvent.click(screen.getByLabelText('Công cụ tẩy'));
    fireEvent.click(screen.getByTestId('color-#dc2626'));
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, pointer(5, 5));
    expect(lastCtx!.strokeStyle).toBe('#dc2626');
    expect(lastCtx!.lineWidth).toBe(3);
  });

  it('"Xóa hết" wipes the canvas (clearRect 0,0,w,h)', () => {
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Xóa hết/ }));
    expect(lastCtx!.clearRect).toHaveBeenCalledWith(0, 0, 600, 260);
  });

  it('changing resetKey wipes canvas (new LO arrives)', () => {
    const { rerender } = render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    const initialClears = lastCtx!.clearRect.mock.calls.length;
    rerender(<WhiteboardPad onClose={() => {}} resetKey="lo-2" />);
    expect(lastCtx!.clearRect.mock.calls.length).toBeGreaterThan(initialClears);
  });

  it('"Đóng" calls onClose', () => {
    const onClose = vi.fn();
    render(<WhiteboardPad onClose={onClose} resetKey="lo-1" />);
    fireEvent.click(screen.getByLabelText('Đóng bảng nháp'));
    expect(onClose).toHaveBeenCalled();
  });

  it('draw SFX is throttled (rapid moves → 1 fire within 80ms window)', () => {
    const sfxSpy = vi.spyOn(audioManager, 'playSfx');
    render(<WhiteboardPad onClose={() => {}} resetKey="lo-1" />);
    const canvas = screen.getByTestId('whiteboard-canvas') as HTMLCanvasElement;
    // Pin Date.now so two rapid moves fall inside the same throttle window.
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    fireEvent.pointerDown(canvas, pointer(0, 0));
    fireEvent.pointerMove(canvas, pointer(1, 1));
    fireEvent.pointerMove(canvas, pointer(2, 2));
    fireEvent.pointerMove(canvas, pointer(3, 3));
    expect(sfxSpy).toHaveBeenCalledTimes(1);
    expect(sfxSpy).toHaveBeenCalledWith('math_whiteboard_draw');
    // Advance past the throttle window — next move fires again.
    dateSpy.mockReturnValue(1_000_000 + 100);
    fireEvent.pointerMove(canvas, pointer(4, 4));
    expect(sfxSpy).toHaveBeenCalledTimes(2);
  });
});
