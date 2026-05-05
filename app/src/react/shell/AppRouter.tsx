/**
 * AppRouter — ISP v1.1 Step 21.
 *
 * Top-level route table + shell lifecycle. Routes:
 *   /         → MainMenu (WF1)
 *   /play     → PlayScreen (Phaser + Quiz + Tutorial)
 *   /guild    → GuildLeaderboard
 *   /inventory→ InventoryScreen
 *   /quests   → QuestsPanel (Sprint D Task 10)
 *   *         → redirect to /
 *
 * initAppLifecycle() fires once on mount and is torn down on unmount —
 * StrictMode double-invocation is safe because teardown is idempotent.
 *
 * Sprint D Task 12 — also owns the QuestEngine lifecycle: creates the
 * engine after SaveState rehydrates (R1 mitigation), kicks off
 * refreshCyclesIfNeeded on mount + on window focus, and tears down on
 * unmount.
 */

import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainMenu } from '@react/screens/MainMenu';
import { GuildLeaderboard } from '@react/screens/GuildLeaderboard';
import { InventoryScreen } from '@react/screens/InventoryScreen';
import { QuestsPanel } from '@react/screens/QuestsPanel';
import { SettingsPanel } from '@react/screens/SettingsPanel';
import { RewardChestOverlay } from '@react/overlays/RewardChestOverlay';
import { PetRescueOverlay } from '@react/overlays/PetRescueOverlay';
import { VictoryBanner } from '@react/overlays/VictoryBanner';
import { QuestProgressToast } from '@react/overlays/QuestProgressToast';
import { QuestEngine } from '@/domain/QuestEngine';
import { useSaveState } from '@/persistence/SaveStateStore';
import { PlayScreen } from './PlayScreen';
import { initAppLifecycle } from './appLifecycle';

export function AppRouter() {
  useEffect(() => {
    const handle = initAppLifecycle();
    return () => handle.teardown();
  }, []);

  // Sprint D Task 12 — QuestEngine lifecycle. Wait for SaveState to
  // rehydrate before subscribing so progress events emitted during
  // boot don't fire against an empty store and get lost (R1).
  const engineRef = useRef<QuestEngine | null>(null);

  useEffect(() => {
    const startEngine = () => {
      engineRef.current = new QuestEngine();
      engineRef.current.start();
      useSaveState.getState().refreshCyclesIfNeeded();
    };

    let cleanupHydration: (() => void) | null = null;
    if (useSaveState.persist.hasHydrated()) {
      startEngine();
    } else {
      cleanupHydration = useSaveState.persist.onFinishHydration(startEngine);
    }

    const onFocus = () => useSaveState.getState().refreshCyclesIfNeeded();
    window.addEventListener('focus', onFocus);

    return () => {
      cleanupHydration?.();
      engineRef.current?.stop();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/guild" element={<GuildLeaderboard />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/quests" element={<QuestsPanel />} />
        <Route path="/settings" element={<SettingsPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Step 22.14 — global LEVEL_UP reward overlay; subscribes the bus */}
      {/* and renders nothing while idle, so it's safe across every route. */}
      <RewardChestOverlay />
      {/* Sprint C Task 9 — PET_RESCUE_OFFERED triggers a collect/release modal */}
      {/* with a roster-cap picker subflow. Renders nothing while idle. */}
      <PetRescueOverlay />
      {/* Step 22.16 — EXIT_COMBAT(won=true) reveals a celebratory banner. */}
      <VictoryBanner />
      {/* Sprint D Task 12 — QUEST_PROGRESS / QUEST_COMPLETED toast. */}
      <QuestProgressToast />
    </BrowserRouter>
  );
}
