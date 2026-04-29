import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MascotDialog } from './MascotDialog';
import { audioManager } from '@/utils/AudioManager';

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

describe('MascotDialog — presentational', () => {
  it('renders portrait image from given file', () => {
    render(
      <MascotDialog
        portraitFile="soc_guide_greet.png"
        text="xin chào"
        onContinue={() => {}}
        typingSpeedMs={0}
      />
    );
    const img = screen.getByAltText('Sóc') as HTMLImageElement;
    expect(img.src).toContain('/assets/mascot/soc_guide_greet.png');
  });

  it('typingSpeedMs=0 reveals full text immediately', () => {
    render(
      <MascotDialog
        portraitFile="soc_guide_talk.png"
        text="Xin chào bạn!"
        onContinue={() => {}}
        typingSpeedMs={0}
      />
    );
    expect(screen.getByText('Xin chào bạn!')).toBeInTheDocument();
  });

  it('typewriter reveals progressively under fake timers', () => {
    vi.useFakeTimers();
    try {
      render(
        <MascotDialog
          portraitFile="soc_guide_talk.png"
          text="abcd"
          onContinue={() => {}}
          typingSpeedMs={10}
        />
      );
      // Initially no chars revealed
      const para = screen.getByTestId('mascot-text');
      expect(para.textContent).toBe('');

      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(para.textContent).toBe('a');

      act(() => {
        vi.advanceTimersByTime(30);
      });
      expect(para.textContent).toBe('abcd');
    } finally {
      vi.useRealTimers();
    }
  });

  it('button shows "Bỏ qua" while typing, switches to continueLabel when full', () => {
    vi.useFakeTimers();
    try {
      render(
        <MascotDialog
          portraitFile="soc_guide_talk.png"
          text="xyz"
          onContinue={() => {}}
          continueLabel="Tiếp"
          typingSpeedMs={10}
        />
      );
      expect(screen.getByRole('button')).toHaveTextContent('Bỏ qua');
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(screen.getByRole('button')).toHaveTextContent('Tiếp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking button while typing jumps to full text (no onContinue)', () => {
    vi.useFakeTimers();
    try {
      const onContinue = vi.fn();
      render(
        <MascotDialog
          portraitFile="soc_guide_talk.png"
          text="hello"
          onContinue={onContinue}
          typingSpeedMs={50}
        />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('mascot-text').textContent).toBe('hello');
      expect(onContinue).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking button when full calls onContinue', () => {
    const onContinue = vi.fn();
    render(
      <MascotDialog
        portraitFile="soc_guide_cheer.png"
        text="done"
        onContinue={onContinue}
        typingSpeedMs={0}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('Step 22.17 — mounting with non-empty text fires world_npc_talk', () => {
    const sfx = vi.spyOn(audioManager, 'playSfx');
    render(
      <MascotDialog
        portraitFile="soc_guide_greet.png"
        text="Chào bạn!"
        onContinue={() => {}}
        typingSpeedMs={0}
      />
    );
    expect(sfx).toHaveBeenCalledWith('world_npc_talk');
    sfx.mockRestore();
  });

  it('Step 22.17 — text change re-fires world_npc_talk', () => {
    const sfx = vi.spyOn(audioManager, 'playSfx');
    const { rerender } = render(
      <MascotDialog
        portraitFile="soc_guide_greet.png"
        text="A"
        onContinue={() => {}}
        typingSpeedMs={0}
      />
    );
    const initialCalls = sfx.mock.calls.filter((c) => c[0] === 'world_npc_talk').length;
    rerender(
      <MascotDialog
        portraitFile="soc_guide_greet.png"
        text="B"
        onContinue={() => {}}
        typingSpeedMs={0}
      />
    );
    const after = sfx.mock.calls.filter((c) => c[0] === 'world_npc_talk').length;
    expect(after).toBeGreaterThan(initialCalls);
    sfx.mockRestore();
  });
});
