/**
 * HmacStorage — ISP v1.1 Step 9.5
 *
 * StateStorage adapter for Zustand persist middleware that:
 *   - Wraps setItem output with {data, hmac} envelope when session key is set
 *   - Verifies hmac on getItem; tamper detected → warn + clear + return null
 *   - Falls through in plain mode when no session key (ephemeral gameplay)
 *   - Legacy values (no JSON envelope) are returned as-is, get auto-re-signed on next write
 *
 * Integration: SaveStateStore wraps localStorage via this adapter.
 */

import type { StateStorage } from 'zustand/middleware';
import { signHex, verifyHex } from './hmac';
import { useSessionKey } from './SessionKeyStore';

interface HmacEnvelope {
  data: string;
  hmac: string;
}

function isEnvelope(value: unknown): value is HmacEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HmacEnvelope).data === 'string' &&
    typeof (value as HmacEnvelope).hmac === 'string'
  );
}

export function createHmacStorage(baseStorage: Storage): StateStorage {
  return {
    getItem: async (name) => {
      const raw = baseStorage.getItem(name);
      if (raw === null) return null;

      const key = useSessionKey.getState().key;
      if (!key) {
        // Ephemeral mode — passthrough
        return raw;
      }

      // Try to parse as envelope
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Legacy non-JSON or corrupt — return as-is
        return raw;
      }

      if (!isEnvelope(parsed)) {
        // Legacy v0 plaintext (no hmac) — accept, will re-sign on next write
        return raw;
      }

      const valid = await verifyHex(parsed.data, parsed.hmac, key);
      if (!valid) {
        console.warn(`[HmacStorage] tamper detected on key="${name}" — clearing.`);
        baseStorage.removeItem(name);
        return null;
      }
      return parsed.data;
    },

    setItem: async (name, value) => {
      const key = useSessionKey.getState().key;
      if (!key) {
        baseStorage.setItem(name, value);
        return;
      }
      const hmac = await signHex(value, key);
      const envelope: HmacEnvelope = { data: value, hmac };
      baseStorage.setItem(name, JSON.stringify(envelope));
    },

    removeItem: (name) => {
      baseStorage.removeItem(name);
    },
  };
}
