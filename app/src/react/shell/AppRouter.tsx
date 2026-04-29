/**
 * AppRouter — ISP v1.1 Step 21.
 *
 * Top-level route table + shell lifecycle. Routes:
 *   /      → MainMenu (WF1)
 *   /play  → PlayScreen (Phaser + Quiz + Tutorial)
 *   *      → redirect to /
 *
 * initAppLifecycle() fires once on mount and is torn down on unmount —
 * StrictMode double-invocation is safe because teardown is idempotent.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainMenu } from '@react/screens/MainMenu';
import { GuildLeaderboard } from '@react/screens/GuildLeaderboard';
import { InventoryScreen } from '@react/screens/InventoryScreen';
import { RewardChestOverlay } from '@react/overlays/RewardChestOverlay';
import { VictoryBanner } from '@react/overlays/VictoryBanner';
import { PlayScreen } from './PlayScreen';
import { initAppLifecycle } from './appLifecycle';

export function AppRouter() {
  useEffect(() => {
    const handle = initAppLifecycle();
    return () => handle.teardown();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/guild" element={<GuildLeaderboard />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Step 22.14 — global LEVEL_UP reward overlay; subscribes the bus */}
      {/* and renders nothing while idle, so it's safe across every route. */}
      <RewardChestOverlay />
      {/* Step 22.16 — EXIT_COMBAT(won=true) reveals a celebratory banner. */}
      <VictoryBanner />
    </BrowserRouter>
  );
}
