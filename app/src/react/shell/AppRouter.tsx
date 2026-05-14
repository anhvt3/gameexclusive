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
import { LootJarOverlay } from '@react/overlays/LootJarOverlay';
import { QuestEngine } from '@/domain/QuestEngine';
import { DailyRewardEngine } from '@/domain/DailyRewardEngine';
import { TelemetryEngine } from '@/observability/TelemetryEngine';
import { SaveSyncEngine } from '@/persistence/SaveSyncEngine';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
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

      // Phase 3 Task 16 — shop stock refresh + event emit
      const before = useSaveState.getState().shopStockRefreshedAt;
      useSaveState.getState().refreshShopStockIfNeeded();
      const after = useSaveState.getState().shopStockRefreshedAt;
      if (after > before) {
        eventBus.emit('SHOP_STOCK_REFRESHED', {
          slots: useSaveState.getState().shopStock,
          anchorUtc7: after,
        });
      }
    };

    let cleanupHydration: (() => void) | null = null;
    if (useSaveState.persist.hasHydrated()) {
      startEngine();
    } else {
      cleanupHydration = useSaveState.persist.onFinishHydration(startEngine);
    }

    const onFocus = () => {
      useSaveState.getState().refreshCyclesIfNeeded();

      // Phase 3 Task 16 — also refresh shop on focus
      const before = useSaveState.getState().shopStockRefreshedAt;
      useSaveState.getState().refreshShopStockIfNeeded();
      const after = useSaveState.getState().shopStockRefreshedAt;
      if (after > before) {
        eventBus.emit('SHOP_STOCK_REFRESHED', {
          slots: useSaveState.getState().shopStock,
          anchorUtc7: after,
        });
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cleanupHydration?.();
      engineRef.current?.stop();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Sprint F Task 12 — DailyRewardEngine lifecycle. Listens for EXIT_COMBAT
  // wins to grant Battle Stars + tick Loot Jar counter.
  const dailyEngineRef = useRef<DailyRewardEngine | null>(null);

  // Phase 4 Task 10 — TelemetryEngine lifecycle. Pure observer — tracks
  // shop + breeding events for analytics. No state mutation.
  const telemetryEngineRef = useRef<TelemetryEngine | null>(null);

  // Phase 5 Task C.7 — SaveSyncEngine lifecycle. Debounced full-state POST
  // to /api/save/sync (2000ms idle window, Q5-4 override). Skips when
  // VITE_BACKEND_ENABLED=false (Phase 4 fallback).
  const saveSyncEngineRef = useRef<SaveSyncEngine | null>(null);

  useEffect(() => {
    const startEngine = () => {
      dailyEngineRef.current = new DailyRewardEngine();
      dailyEngineRef.current.start();
    };

    let cleanupHydration: (() => void) | null = null;
    if (useSaveState.persist.hasHydrated()) {
      startEngine();
    } else {
      cleanupHydration = useSaveState.persist.onFinishHydration(startEngine);
    }

    return () => {
      cleanupHydration?.();
      dailyEngineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const start = () => {
      telemetryEngineRef.current = new TelemetryEngine();
      telemetryEngineRef.current.start();
    };
    let cleanup: (() => void) | null = null;
    if (useSaveState.persist.hasHydrated()) {
      start();
    } else {
      cleanup = useSaveState.persist.onFinishHydration(start);
    }
    return () => {
      cleanup?.();
      telemetryEngineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const start = () => {
      saveSyncEngineRef.current = new SaveSyncEngine();
      saveSyncEngineRef.current.start();
    };
    let cleanup: (() => void) | null = null;
    if (useSaveState.persist.hasHydrated()) {
      start();
    } else {
      cleanup = useSaveState.persist.onFinishHydration(start);
    }
    return () => {
      cleanup?.();
      saveSyncEngineRef.current?.stop();
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
      {/* Sprint F Task 12 — LOOT_JAR_READY triggers a 3-frame jar reveal. */}
      <LootJarOverlay />
    </BrowserRouter>
  );
}
