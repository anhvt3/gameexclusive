import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPanel } from './SettingsPanel';
import { useSaveState } from '@/persistence/SaveStateStore';
import { TUTORIAL_FLAG } from '@/react/mascot/tutorialSteps';

const renderPanel = () =>
  render(
    <MemoryRouter>
      <SettingsPanel />
    </MemoryRouter>
  );

describe('SettingsPanel', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders 4 controls + back link', () => {
    renderPanel();
    expect(screen.getByTestId('settings-audio-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('settings-hint-easy')).toBeInTheDocument();
    expect(screen.getByTestId('settings-hint-medium')).toBeInTheDocument();
    expect(screen.getByTestId('settings-hint-hard')).toBeInTheDocument();
    expect(screen.getByTestId('settings-replay-tutorial')).toBeInTheDocument();
    expect(screen.getByTestId('settings-reset-save')).toBeInTheDocument();
    expect(screen.getByTestId('settings-back-home')).toBeInTheDocument();
  });

  it('audio toggle flips flags.audio_muted', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('settings-audio-toggle'));
    expect(useSaveState.getState().flags['audio_muted']).toBe(true);
    fireEvent.click(screen.getByTestId('settings-audio-toggle'));
    expect(useSaveState.getState().flags['audio_muted']).toBe(false);
  });

  it('hint difficulty segmented updates hintDifficulty', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('settings-hint-hard'));
    expect(useSaveState.getState().hintDifficulty).toBe('hard');
    fireEvent.click(screen.getByTestId('settings-hint-easy'));
    expect(useSaveState.getState().hintDifficulty).toBe('easy');
  });

  it('replay tutorial clears TUTORIAL_FLAG', () => {
    useSaveState.getState().setFlag(TUTORIAL_FLAG, true);
    renderPanel();
    fireEvent.click(screen.getByTestId('settings-replay-tutorial'));
    expect(useSaveState.getState().flags[TUTORIAL_FLAG]).toBe(false);
  });

  it('reset save shows confirm, on confirm calls reset()', () => {
    useSaveState.getState().setPlayerName('Minh');
    renderPanel();
    fireEvent.click(screen.getByTestId('settings-reset-save'));
    expect(screen.getByTestId('reset-confirm-yes')).toBeInTheDocument();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: vi.fn() },
    });
    fireEvent.click(screen.getByTestId('reset-confirm-yes'));
    expect(useSaveState.getState().playerName).toBeNull();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('reset save cancel keeps state', () => {
    useSaveState.getState().setPlayerName('Minh');
    renderPanel();
    fireEvent.click(screen.getByTestId('settings-reset-save'));
    fireEvent.click(screen.getByTestId('reset-confirm-no'));
    expect(useSaveState.getState().playerName).toBe('Minh');
    expect(screen.queryByTestId('reset-confirm-yes')).toBeNull();
  });
});
