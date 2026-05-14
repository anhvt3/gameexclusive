/**
 * SaveSyncEngine — Phase 5 client-side observer.
 *
 * Subscribes to useSaveState changes. After 2 seconds idle (Q5-4 anh override
 * from 300ms → 2000ms to reduce Vercel invocations + MySQL pool pressure),
 * POSTs the full SaveState v10 blob to /api/save/sync with HMAC + nonce.
 *
 * Lifecycle managed by AppRouter (mounts/unmounts engine alongside Quest /
 * DailyReward / Telemetry engines).
 *
 * Rollback: VITE_BACKEND_ENABLED=false short-circuits start() → no POSTs,
 * Phase 4 local-only behavior preserved.
 *
 * Optimistic concurrency: server returns `server_updated_at`. Subsequent
 * POSTs include `lastKnownUpdatedAt` for stale-save rejection (Phase 6
 * implements full conflict handling; Phase 5 last-write-wins is acceptable).
 */

import { useSaveState } from './SaveStateStore';
import { deriveKeyFromString, signHex } from './hmac';

const SYNC_DEBOUNCE_MS = 2000;
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const ENDPOINT = `${API_BASE}/api/save/sync`;
const BACKEND_ENABLED = import.meta.env.VITE_BACKEND_ENABLED !== 'false';
const SECRET = (import.meta.env.VITE_PHASE5_VALIDATION_SECRET as string | undefined)
  ?? 'phase5-game-ss3-validation-secret-v1';

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey === null) cachedKey = await deriveKeyFromString(SECRET);
  return cachedKey;
}

export class SaveSyncEngine {
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastKnownUpdatedAt: string | null = null;
  private inflightAbort: AbortController | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    if (!BACKEND_ENABLED) {
      console.info('[SaveSyncEngine] VITE_BACKEND_ENABLED=false — sync disabled (Phase 4 fallback)');
      return;
    }
    this.started = true;
    // Subscribe to any state change. Zustand selector returns full state by
    // default; em wants to react on virtually any mutation that matters.
    this.unsubscribe = useSaveState.subscribe(() => {
      this.scheduleSync();
    });
  }

  stop(): void {
    this.started = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inflightAbort) {
      this.inflightAbort.abort();
      this.inflightAbort = null;
    }
  }

  /** Schedule a debounced sync. Multiple state changes within window coalesce. */
  private scheduleSync(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, SYNC_DEBOUNCE_MS);
  }

  /** Build payload + POST. Soft-fail on network error. */
  private async flush(): Promise<void> {
    const state = useSaveState.getState();
    const clevaiUserId = state.clevaiUserId;
    if (clevaiUserId === null || clevaiUserId === undefined) {
      // Anonymous session — skip sync entirely
      return;
    }

    // Build SaveStateV10 payload (snake_case for server, camelCase from state)
    const payload = this.buildPayload(clevaiUserId, state);
    const rawBody = JSON.stringify(payload);
    const nonce = state.clientNonce + 1;

    try {
      const key = await getKey();
      const hmac = await signHex(`${nonce}:${rawBody}`, key);

      // Bump nonce BEFORE fetch (replay safety even on network error)
      useSaveState.getState().bumpClientNonce();

      // Abort previous in-flight request (debouncer should prevent overlap
      // but defensive)
      if (this.inflightAbort) this.inflightAbort.abort();
      this.inflightAbort = new AbortController();

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-nonce': String(nonce),
          'x-hmac': hmac,
        },
        body: rawBody,
        signal: this.inflightAbort.signal,
      });
      this.inflightAbort = null;

      if (!res.ok) {
        console.warn(`[SaveSyncEngine] sync HTTP ${res.status} (soft-fail)`);
        return;
      }
      const result = (await res.json()) as { ok?: boolean; server_updated_at?: string };
      if (result.server_updated_at) {
        this.lastKnownUpdatedAt = result.server_updated_at;
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      console.warn('[SaveSyncEngine] sync failed (soft-fail):', err);
    }
  }

  private buildPayload(clevaiUserId: number, s: ReturnType<typeof useSaveState.getState>): Record<string, unknown> {
    return {
      clevaiUserId,
      lastKnownUpdatedAt: this.lastKnownUpdatedAt,
      state: {
        hp: s.hp, maxHp: s.maxHp, mp: s.mp, maxMp: s.maxMp,
        level: s.level, exp: s.exp,
        battleStars: s.battleStars,
        loginStreak: s.loginStreak,
        lastLoginAnchorUtc7: s.lastLoginAnchorUtc7,
        lootJarBattlesSinceLast: s.lootJarBattlesSinceLast,
        playerName: s.playerName,
        gender: s.gender,
        hairStyle: s.hairStyle,
        hintDifficulty: s.hintDifficulty,
        clientNonce: s.clientNonce,
        position: s.position,
        currentZoneId: s.currentZoneId,
        lastLevelUpAt: s.lastLevelUpAt,
        active_pet_instance_id: s.active_pet_instance_id,
        last_boss_attempt_date: s.last_boss_attempt_date,
        shopStockRefreshedAt: s.shopStockRefreshedAt,
        inventory: s.inventory,
        equipment: s.equipment,
        ownedPets: s.ownedPets,
        questProgress: s.questProgress,
        claimedRewards: s.claimedRewards,
        questCycleAnchors: s.questCycleAnchors,
        shopStock: s.shopStock,
        purchaseHistory: s.purchaseHistory,
        breedingChamber: s.breedingChamber,
        flags: s.flags,
        defeatedBossIds: s.defeatedBossIds,
        claimedChestIds: s.claimedChestIds,
      },
    };
  }
}
