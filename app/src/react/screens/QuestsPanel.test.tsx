import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QuestsPanel } from './QuestsPanel';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

function renderPanel() {
  return render(
    <MemoryRouter>
      <QuestsPanel />
    </MemoryRouter>
  );
}

describe('QuestsPanel', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders 3 tier sections with correct quest counts', () => {
    renderPanel();
    expect(screen.getByTestId('quests-tier-daily')).toBeInTheDocument();
    expect(screen.getByTestId('quests-tier-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('quests-tier-main')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^quest-card-/)).toHaveLength(8);
  });

  it('shows "in-progress" state with progress bar (M/N)', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    renderPanel();
    const card = screen.getByTestId('quest-card-daily-combat-3');
    expect(card).toHaveTextContent(/2\/3/);
  });

  it('shows "ready" state with claim button when progress at target and not claimed', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    renderPanel();
    expect(screen.getByTestId('quest-claim-daily-combat-3')).toBeInTheDocument();
  });

  it('shows "claimed" state when in claimedRewards', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
      claimedRewards: ['daily-combat-3'],
    });
    renderPanel();
    expect(screen.getByTestId('quest-card-daily-combat-3')).toHaveTextContent(/Đã nhận/);
    expect(screen.queryByTestId('quest-claim-daily-combat-3')).toBeNull();
  });

  it('clicking claim emits CHEST_OPENED with label="Đóng" and adds to claimedRewards', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const events: any[] = [];
    const off = eventBus.on('CHEST_OPENED', (p) => events.push(p));
    renderPanel();
    fireEvent.click(screen.getByTestId('quest-claim-daily-combat-3'));
    off();
    // ITEM_REGISTRY has 4 commons → reward will succeed.
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Đóng');
    expect(events[0].chestId).toBe('quest-daily-combat-3');
    expect(useSaveState.getState().claimedRewards).toContain('daily-combat-3');
  });
});

describe('QuestsPanel Sprint E personalization', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('header reads "Nhiệm vụ của Minh" when playerName=Minh', () => {
    useSaveState.getState().setPlayerName('Minh');
    renderPanel();
    expect(screen.getByText(/Nhiệm vụ của Minh/)).toBeInTheDocument();
  });

  it('header reads "Nhiệm vụ của Khách" when playerName is null', () => {
    renderPanel();
    expect(screen.getByText(/Nhiệm vụ của Khách/)).toBeInTheDocument();
  });
});
