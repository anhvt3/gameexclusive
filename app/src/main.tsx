import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useSaveState } from '@/persistence/SaveStateStore';
import { initAmplitudeIfConfigured } from '@/observability/amplitude';

/**
 * Phase 5 C.7 — bootstrap user attribution.
 *
 * Clevai single-sign-on hands off via `?cu=<numeric user id>` query.
 * We parse once at boot and write into SaveStateStore so Telemetry +
 * SaveSyncEngine pick the same canonical user id.
 *
 * Falls back to whatever's already persisted (anonymous = null) when
 * the query string is absent — preserves Phase 4 local-only behavior.
 */
function bootstrapClevaiUserId(): number | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('cu');
    if (raw === null) return useSaveState.getState().clevaiUserId;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return useSaveState.getState().clevaiUserId;
    useSaveState.getState().setUserId(id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Capture `?test=1` query at boot and persist via sessionStorage so the
 * PhaserGame test bridge stays open even after React router strips the
 * query string on /play navigation. Opt-in by URL — no real-user impact.
 */
function bootstrapTestGate(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === '1') {
      window.sessionStorage.setItem('__game_test_gate', '1');
    }
  } catch {
    /* private mode / SSR — bridge stays closed, expected */
  }
}

const bootedUserId = bootstrapClevaiUserId();
bootstrapTestGate();
void initAmplitudeIfConfigured(bootedUserId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
