import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { MainMenu } from './MainMenu';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';
import { BOSS_PENDING_FLAG, todayIso } from '@domain/BossQuest';
import { audioManager } from '@/utils/AudioManager';
import { dailyAnchor } from '@/domain/QuestCycle';

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

  it('clicking "Bắt đầu" when already onboarded navigates to /play', () => {
    useSaveState.getState().setPlayerName('Minh');
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
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

  it('Giới thiệu button is disabled (deferred)', () => {
    renderMenu();
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

describe('MainMenu — Sprint E personalization + Settings + onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  it('shows "Xin chào, Khách!" when playerName is null', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByText(/Xin chào, Khách!/)).toBeInTheDocument();
  });

  it('shows "Xin chào, Minh!" when playerName=Minh', () => {
    useSaveState.getState().setPlayerName('Minh');
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByText(/Xin chào, Minh!/)).toBeInTheDocument();
  });

  it('renders Cài đặt (Settings) button', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-settings')).toBeInTheDocument();
  });

  it('clicking Bắt đầu when not yet onboarded opens OnboardingFlow', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('main-menu-play'));
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
  });

  it('clicking Bắt đầu when already onboarded navigates straight to /play', () => {
    useSaveState.getState().setPlayerName('Minh');
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/play" element={<div data-testid="play-screen">Play</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('main-menu-play'));
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });
});

describe('Sprint F — daily rewards integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  it('mounts BattleStarsBadge in header', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('battle-stars-badge')).toBeInTheDocument();
  });

  it('mounts "Quà Hằng Ngày" button', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-daily-rewards')).toBeInTheDocument();
  });

  it('shows sparkle indicator when login is claimable', () => {
    // Fresh state has lastLoginAnchorUtc7=0 → isLoginClaimable=true
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-daily-rewards-sparkle')).toBeInTheDocument();
  });

  it('hides sparkle when already claimed today', () => {
    useSaveState.getState().commitLoginClaim(dailyAnchor(Date.now()), 1);
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-daily-rewards-sparkle')).not.toBeInTheDocument();
  });

  it('clicking daily rewards button opens DailyLoginCalendarOverlay', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('daily-login-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('main-menu-daily-rewards'));
    expect(screen.getByTestId('daily-login-overlay')).toBeInTheDocument();
  });
});

describe('Phase 3 — shop + breeding buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  it('mounts "Cửa Hàng" button', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-shop')).toBeInTheDocument();
  });

  it('mounts "Lai Tạo" button', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-breeding')).toBeInTheDocument();
  });

  it('clicking shop button opens ShopOverlay', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('shop-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('main-menu-shop'));
    expect(screen.getByTestId('shop-overlay')).toBeInTheDocument();
  });

  it('clicking breeding button opens PetBreedingOverlay', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('breed-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('main-menu-breeding'));
    expect(screen.getByTestId('breed-overlay')).toBeInTheDocument();
  });
});

describe('Phase 4 — breedingReady sparkle on Lai Tạo button', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  it('shows sparkle on breeding button when chamber ready', () => {
    useSaveState.getState().addBattleStars(100);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: Date.now() - 1000,
      hatchAt: Date.now() - 500,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-breeding-sparkle')).toBeInTheDocument();
  });

  it('hides sparkle when chamber still incubating', () => {
    useSaveState.getState().addBattleStars(100);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: Date.now(),
      hatchAt: Date.now() + 60_000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-breeding-sparkle')).not.toBeInTheDocument();
  });
});
