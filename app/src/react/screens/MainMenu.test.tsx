import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { MainMenu } from './MainMenu';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';
import { BOSS_PENDING_FLAG, todayIso } from '@domain/BossQuest';
import { audioManager } from '@/utils/AudioManager';

vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(_opts: unknown) {}
  },
}));

function renderMenu(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<div data-testid="play-screen">PLAY</div>} />
        <Route path="/guild" element={<div data-testid="guild-screen">GUILD</div>} />
        <Route path="/inventory" element={<div data-testid="inventory-screen">INVENTORY</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('MainMenu — WF1', () => {
  it('renders heading + primary CTAs + Sóc portrait', () => {
    renderMenu();
    expect(screen.getByRole('heading', { name: /Elemagica/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeInTheDocument();
    expect(screen.getByAltText('Sóc Clevai')).toBeInTheDocument();
  });

  it('"Tiếp tục" is disabled when no progress (fresh state)', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeDisabled();
  });

  it('"Tiếp tục" is enabled when tutorial_completed flag set', () => {
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    renderMenu();
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeEnabled();
  });

  it('"Tiếp tục" is enabled when player has EXP > 0', () => {
    useSaveState.getState().gainExp(10);
    renderMenu();
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeEnabled();
  });

  it('clicking "Bắt đầu" navigates to /play', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i }));
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });

  it('clicking enabled "Tiếp tục" navigates to /play', () => {
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });

  it('Settings + Giới thiệu buttons are disabled (deferred)', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /Cài đặt/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Giới thiệu/i })).toBeDisabled();
  });

  it('"Bảng xếp hạng lớp" navigates to /guild', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Bảng xếp hạng lớp/i }));
    expect(screen.getByTestId('guild-screen')).toBeInTheDocument();
  });

  it('boss button enabled when no attempt today, sets pending flag + navigates /play', () => {
    renderMenu();
    const btn = screen.getByRole('button', { name: /Boss hôm nay/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(useSaveState.getState().flags[BOSS_PENDING_FLAG]).toBe(true);
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });

  it('"Kho đồ" navigates to /inventory', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /^Kho đồ$/ }));
    expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
  });

  it('Step 22.17 — primary buttons fire ui_btn_hover on mouseenter', () => {
    const sfx = vi.spyOn(audioManager, 'playSfx');
    renderMenu();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Bắt đầu cuộc phiêu lưu/i }));
    expect(sfx).toHaveBeenCalledWith('ui_btn_hover');
    sfx.mockRestore();
  });

  it('Step 22.17 — primary buttons fire ui_btn_click on click', () => {
    const sfx = vi.spyOn(audioManager, 'playSfx');
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Bảng xếp hạng lớp/i }));
    expect(sfx).toHaveBeenCalledWith('ui_btn_click');
    sfx.mockRestore();
  });

  it('boss button disabled + alt label when last attempt = today', () => {
    useSaveState.getState().setLastBossAttemptDate(todayIso());
    renderMenu();
    const btn = screen.getByRole('button', { name: /ngày mai/i });
    expect(btn).toBeDisabled();
  });
});

describe('MainMenu — Nhiệm vụ button + sparkle (Sprint D)', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  it('renders "Nhiệm vụ" button navigating to /quests', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/quests" element={<div data-testid="quests-screen">QUESTS</div>} />
        </Routes>
      </MemoryRouter>
    );
    const btn = screen.getByTestId('main-menu-quests');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByTestId('quests-screen')).toBeInTheDocument();
  });

  it('shows sparkle indicator when at least one quest is ready to claim', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-quests-sparkle')).toBeInTheDocument();
  });

  it('hides sparkle when no quest is ready', () => {
    useSaveState.setState({ questProgress: {} });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-quests-sparkle')).toBeNull();
  });

  it('hides sparkle when ready quest is already claimed', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
      claimedRewards: ['daily-combat-3'],
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-quests-sparkle')).toBeNull();
  });
});
