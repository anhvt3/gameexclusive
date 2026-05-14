/**
 * Amplitude client-side init (Phase 5).
 *
 * Lazy init pattern: SDK loaded dynamically on first track call to avoid
 * blocking initial page paint (Amplitude bundle ~50KB).
 *
 * Per Q5-5 decision: client-side init only for user identification +
 * potential client-side track() calls. PRIMARY telemetry path is still
 * server-proxy via /api/telemetry (which forwards to Amplitude Node SDK
 * server-side). This file enables Phase 6 hybrid mode if anh wants
 * client-side direct track for some events.
 */

let initialized = false;

export async function initAmplitudeIfConfigured(clevaiUserId: number | null): Promise<boolean> {
  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.info('[amplitude] VITE_AMPLITUDE_API_KEY not set — client-side disabled');
    return false;
  }
  if (initialized) return true;
  try {
    const amp = await import('@amplitude/analytics-browser');
    amp.init(apiKey, undefined, {
      defaultTracking: false,        // Disable auto-tracking — em manually track
      autocapture: false,
    });
    if (clevaiUserId !== null) {
      amp.setUserId(String(clevaiUserId));
    }
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[amplitude] init failed (soft-fail):', e);
    return false;
  }
}

export async function setAmplitudeUserId(clevaiUserId: number | null): Promise<void> {
  if (!initialized) return;
  try {
    const amp = await import('@amplitude/analytics-browser');
    if (clevaiUserId !== null) {
      amp.setUserId(String(clevaiUserId));
    } else {
      amp.reset();
    }
  } catch (e) {
    console.warn('[amplitude] setUserId failed:', e);
  }
}

export function isAmplitudeInitialized(): boolean {
  return initialized;
}

/** Test-only reset. */
export function __resetAmplitudeForTests(): void {
  initialized = false;
}
