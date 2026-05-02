import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { eventBus } from '@bus/EventBus';
import { audioManager } from '@/utils/AudioManager';
import { REWARD_CHEST_PHASE_MS, RewardChestOverlay } from './RewardChestOverlay';

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

beforeEach(() => {
  eventBus.clear();
  audioManager.__reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function advancePhase(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('RewardChestOverlay — Step 22.14', () => {
  it('renders nothing while idle (no LEVEL_UP yet)', () => {
    const { container } = render(<RewardChestOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('LEVEL_UP with grantedItemId → overlay opens with item name', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 3, grantedItemId: 'wand-fire-01' });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Lên cấp 3/)).toBeInTheDocument();
    expect(screen.getByText(/Đũa Hỏa Tinh/)).toBeInTheDocument();
  });

  it('LEVEL_UP with null grantedItemId → fallback message, no item icon', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 2, grantedItemId: null });
    });
    expect(screen.getByText(/Bạn lên cấp/)).toBeInTheDocument();
    expect(screen.queryByTestId('chest-item-icon')).not.toBeInTheDocument();
  });

  it('phase progresses closed → wobble → open over the configured timeline', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 4, grantedItemId: 'hat-fire-01' });
    });
    expect(screen.getByRole('dialog').dataset.phase).toBe('closed');
    advancePhase(REWARD_CHEST_PHASE_MS.closed);
    expect(screen.getByRole('dialog').dataset.phase).toBe('wobble');
    advancePhase(REWARD_CHEST_PHASE_MS.wobble);
    expect(screen.getByRole('dialog').dataset.phase).toBe('open');
    expect(screen.getByTestId('chest-item-icon')).toBeInTheDocument();
  });

  it('overlay auto-dismisses after the open phase ends', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 2, grantedItemId: null });
    });
    advancePhase(REWARD_CHEST_PHASE_MS.closed);
    advancePhase(REWARD_CHEST_PHASE_MS.wobble);
    advancePhase(REWARD_CHEST_PHASE_MS.open);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('multi-level cascade animates sequentially', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 2, grantedItemId: 'hat-apprentice-01' });
      eventBus.emit('LEVEL_UP', { newLevel: 3, grantedItemId: 'wand-fire-01' });
    });
    // First grant in flight
    expect(screen.getByText(/Lên cấp 2/)).toBeInTheDocument();
    // Step grant 1 phase by phase so React commits + drain effect schedules
    // the next setTimeout between firings.
    advancePhase(REWARD_CHEST_PHASE_MS.closed);
    advancePhase(REWARD_CHEST_PHASE_MS.wobble);
    advancePhase(REWARD_CHEST_PHASE_MS.open);
    // Grant 2 should now have started — closed phase is 300ms, give it room
    // to enter and render the new heading text.
    advancePhase(REWARD_CHEST_PHASE_MS.closed);
    expect(screen.getByText(/Lên cấp 3/)).toBeInTheDocument();
  });

  it('Tiếp tục skip button dismisses immediately + plays world_chest_open', () => {
    const sfxSpy = vi.spyOn(audioManager, 'playSfx');
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 2, grantedItemId: null });
    });
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));
    expect(sfxSpy).toHaveBeenCalledWith('world_chest_open');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('natural open phase fires world_chest_open SFX once', () => {
    const sfxSpy = vi.spyOn(audioManager, 'playSfx');
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 2, grantedItemId: 'hat-apprentice-01' });
    });
    advancePhase(REWARD_CHEST_PHASE_MS.closed);
    advancePhase(REWARD_CHEST_PHASE_MS.wobble);
    expect(sfxSpy).toHaveBeenCalledWith('world_chest_open');
    expect(sfxSpy.mock.calls.filter((c) => c[0] === 'world_chest_open')).toHaveLength(1);
  });
});

describe('RewardChestOverlay — Sprint B CHEST_OPENED handler', () => {
  it('opens with the items list when CHEST_OPENED fires', async () => {
    const { eventBus } = await import('@/bus/EventBus');
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('CHEST_OPENED', {
        chestId: 'forest-boss-chest',
        zoneId: 'forest-island',
        items: [{ itemId: 'wand-fire-01', qty: 1 }],
      });
    });
    expect(screen.getByTestId('chest-overlay-back-to-world-map')).toBeInTheDocument();
  });

  it('clicking "Về Bản Đồ" emits EXIT_ZONE(reason=completed) and closes the overlay', async () => {
    const { eventBus } = await import('@/bus/EventBus');
    const events: Array<{ zoneId: string; reason: 'retreat' | 'completed' }> = [];
    const off = eventBus.on('EXIT_ZONE', (p) => events.push(p));
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('CHEST_OPENED', {
        chestId: 'forest-boss-chest',
        zoneId: 'forest-island',
        items: [{ itemId: 'wand-fire-01', qty: 1 }],
      });
    });
    const btn = screen.getByTestId('chest-overlay-back-to-world-map');
    act(() => {
      fireEvent.click(btn);
    });
    off();
    expect(events).toEqual([{ zoneId: 'forest-island', reason: 'completed' }]);
    expect(screen.queryByTestId('chest-overlay-back-to-world-map')).toBeNull();
  });

  it('clicking "Về Bản Đồ" clears currentZoneId in SaveState', async () => {
    const { eventBus } = await import('@/bus/EventBus');
    const { useSaveState } = await import('@/persistence/SaveStateStore');
    useSaveState.getState().setCurrentZoneId('forest-island');
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('CHEST_OPENED', {
        chestId: 'forest-boss-chest',
        zoneId: 'forest-island',
        items: [{ itemId: 'wand-fire-01', qty: 1 }],
      });
    });
    const btn = screen.getByTestId('chest-overlay-back-to-world-map');
    act(() => {
      fireEvent.click(btn);
    });
    expect(useSaveState.getState().currentZoneId).toBeNull();
  });

  it('does not break the existing LEVEL_UP path', async () => {
    const { eventBus } = await import('@/bus/EventBus');
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('LEVEL_UP', { newLevel: 5, grantedItemId: 'wand-fire-01' });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Lên cấp 5/)).toBeInTheDocument();
  });
});
