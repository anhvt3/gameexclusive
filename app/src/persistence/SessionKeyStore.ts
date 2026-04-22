/**
 * SessionKeyStore — ISP v1.1 Step 9.5
 *
 * Non-persisted Zustand store holding the current session HMAC key.
 * CryptoKey lives in memory ONLY — never written to localStorage / IndexedDB / cookies.
 *
 * Lifecycle:
 *   - setKey(key) called on login or game boot (ephemeral)
 *   - clearKey() on logout / reset
 *   - HmacStorage reads current value synchronously via getState().key
 */

import { create } from 'zustand';

interface SessionKeyState {
  key: CryptoKey | null;
  setKey: (key: CryptoKey) => void;
  clearKey: () => void;
}

export const useSessionKey = create<SessionKeyState>((set) => ({
  key: null,
  setKey: (key) => set({ key }),
  clearKey: () => set({ key: null }),
}));
