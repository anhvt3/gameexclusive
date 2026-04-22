import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MainMenu } from './MainMenu';
import { useSaveState } from '@persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@react/mascot/tutorialSteps';

function renderMenu(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<div data-testid="play-screen">PLAY</div>} />
        <Route path="/guild" element={<div data-testid="guild-screen">GUILD</div>} />
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
});
