# Phase 4 — Production Deploy — Design Spec (design-only, no infra code)

**Phase:** 4 (sibling spec to liveops-design)
**Type:** A (doc deliverable)
**Author:** Claude
**Status:** Draft → đợi anh review (12/05/2026)
**Scope:** Phase 4 ships SPEC ONLY per Q10. CI/CD + infra code in Phase 5+.

## 1. Why this spec

Phase 4 ships `PHASE3_DEV_SECRET` literal in 2 files, Vite middleware that disappears in production, soft-fail validation that always allows actions. Before public launch, these need real implementations. This spec documents the design BEFORE Phase 5 implements — so anh + ARCH can review tradeoffs without code commitment.

## 2. Host frontend

| Candidate | Pros | Cons | Verdict |
|---|---|---|---|
| Cloudflare Pages | Best PoP in Vietnam (HCM/HN). Generous free tier. Workers for /api routes. | Workers KV pricing if telemetry scales. | ⭐ Recommended |
| Vercel | Familiar DX, edge functions. | PoP in VN via Singapore relay. Bandwidth costs. | Backup |
| Netlify | Cheap, simple. | No regional VN PoP. Slow first paint. | Reject |
| Static S3 + CloudFront | Most flexible. | Higher ops cost, manual cache headers. | Reject (over-eng) |

**Decision:** Cloudflare Pages. Workers handle `/api/{shop,breed}/validate` + `/api/telemetry`.

## 3. Build pipeline

- `npm run build` → Vite production output to `app/dist/`.
- Asset hashing: Vite default (content-hash filenames + immutable cache headers).
- Source maps: dev only (`vite.config.ts` `build.sourcemap = false` for production).
- Bundle budget: enforce <500KB initial JS + <200KB CSS via `rollup-plugin-visualizer` + CI gate.
- Lighthouse CI: budget mobile-3G score >= 80 performance, >= 90 accessibility. Hook to `.github/workflows/deploy.yml` Phase 5.

## 4. HMAC server-side reality

Phase 3 ship: `PHASE3_DEV_SECRET = 'phase3-game-ss3-validation-secret-v1'` hardcoded in client + Vite middleware (dev only).

Phase 5 production:
- Client: derives key from `import.meta.env.VITE_PHASE3_VALIDATION_SECRET` (build-time injected from CI).
- Server (Cloudflare Worker):
  - Reads `env.PHASE3_VALIDATION_SECRET` (Cloudflare secret binding).
  - On request: verify HMAC + check nonce against KV store (`validation_nonces` namespace, TTL 1h).
  - Nonce-already-used → 401 `replay_attempted`.
  - Authoritative state check: query player save snapshot in D1/KV; reject purchases if server-side `battleStars < priceCharged`.
  - Sliding window rate limit per player: max 60 purchase actions / 5 min.
- Rotation: rotate secret quarterly. CI auto-redeploys both client + worker with new key.

## 5. Telemetry destination

Phase 4 ship: console.log + mock POST `/api/telemetry` (Vite middleware logs to dev terminal).

Phase 5 candidates:

| Platform | Free tier | Pros | Cons |
|---|---|---|---|
| Mixpanel | 100K monthly events | Mature funnel analysis, Vietnam users supported | Migration cost from Zod → Mixpanel `track()` |
| Amplitude | 10M monthly events | Generous tier, free | Slightly heavier SDK |
| PostHog (self-host) | Unlimited | Own data | Requires VPS, ops cost |
| Segment (router) | 1K MTU | Routes to multiple destinations | Adds latency, free tier tiny |

**Decision matrix:** Clevai ~10K students × ~50 events/day = 500K events/day = 15M/month. Mixpanel free insufficient → Amplitude OR PostHog self-host.

⭐ Recommend **Amplitude** Phase 5 (fast onboard, generous free, no ops). Migrate to PostHog Phase 6 if scale demands.

Phase 5 implementation:
- Replace `TELEMETRY_ENDPOINT` const + `track()` impl with Amplitude SDK `track('event_name', properties)`.
- Keep Zod schemas as validation layer in front of SDK.
- TelemetryEngine unchanged.

## 6. Rollout strategy

- **Stage 1 (internal Clevai, current):** all students see Phase 4 features.
- **Stage 2 (beta cohort, 10%):** add `flags.phase4_beta_enabled` SaveState flag. AppRouter gates breeding timer + telemetry behind flag.
- **Stage 3 (100%):** flip flag default to true. Remove gate after 1 week.

Feature flag implementation: use existing `flags: Record<string, boolean>` SaveState field. NO external service this phase (LaunchDarkly defer Phase 7).

## 7. Monitoring

- **Errors:** Sentry already integrated (Step 18.5). Add Phase 4 error tags: `phase4.breeding_rush_fail`, `phase4.telemetry_post_fail`.
- **Health check:** GET `/health` Worker endpoint returns 200 + version string. Pingdom / UptimeRobot pings every 5min.
- **Synthetic monitoring:** Phase 6 nice-to-have. Skip Phase 5.

## 8. Backup / recovery

- Zustand `persist` writes to `localStorage`. If we change domain (e.g. game.clevai.com → game.clevai.edu.vn), users lose state.
- Phase 5 mitigation: implement `/api/save/export` + `/api/save/import` endpoints. UI: Settings → "Sao lưu / Khôi phục" → downloads JSON file. User can manually copy to new domain.
- Long-term Phase 7: server-side save sync (D1 player records keyed by Clevai SSO token).

## 9. Deploy CI/CD (Phase 5 scope, design only here)

Sketch `.github/workflows/deploy.yml`:
1. Trigger: push to `main` after PR merge.
2. Test: `npm run test:run` + `npm run lint` + `npm run typecheck` + `npm run verify` + `npm run test:e2e`.
3. Build: `VITE_PHASE3_VALIDATION_SECRET=$SECRET npm run build`.
4. Bundle budget gate: fail if `app/dist/assets/index-*.js` > 500KB.
5. Lighthouse CI gate: fail if mobile score < 80.
6. Deploy:
   - `wrangler pages deploy app/dist --project-name=game-ss3` (Cloudflare Pages).
   - `wrangler deploy server/worker.ts` (Workers for /api routes).
7. Smoke test: curl `/health` post-deploy → fail rollback if not 200.
8. Notify Slack/Lark channel on success/failure.

## 10. Open questions for anh

- **Q-deploy-1:** Confirm Cloudflare Pages over Vercel?
- **Q-deploy-2:** Confirm Amplitude over PostHog self-host?
- **Q-deploy-3:** Phase 5 backend stack: Cloudflare Workers + D1 + KV, or separate Node service + Postgres?
- **Q-deploy-4:** Sentry plan: free tier (5K errors/month) sufficient for 10K students?
- **Q-deploy-5:** Domain: keep `game.clevai.edu.vn` or new vanity (e.g. `play.clevai.com`)?

Answer in Phase 5 brainstorm session before implementing.

---

**End Phase 4 production deploy spec.** No code shipped this phase. Phase 5 implements per this design after anh answers Q-deploy-1..5.
