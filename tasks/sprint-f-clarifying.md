# Sprint F — Free Daily Rewards — Clarifying Questions

**Sprint:** F (cuối Phase 2.5)
**Roadmap:** `docs/roadmap_phase2.5_prodigy_parity.md` § Sprint F
**Type B** — SaveState v7→v8 (3 sub-features cùng schema delta)
**Predecessors:** Sprint A `ed6dbee` · B `c5a78b4` · C `b79f3ac` · D `9388301` · E `0b1c02f`
**Author:** Claude (`claude/awesome-margulis-adb6d5`)
**Status:** Draft — đợi anh chốt 8 câu trước khi viết spec

---

## Tóm tắt scope (per roadmap)

3 sub-features lồng vào nhau:

1. **Daily login calendar** — 7-day cycle, claim 1 lần / ngày, streak bonus
2. **Loot Jar** — claim mỗi 3 trận thắng, animation jar shake → pop → 3 prizes
3. **Battle Stars** — currency earned per battle, persist, display (chi tiêu Phase 3)

**SaveState v8 thêm:** `lastLoginIso` · `loginStreak` · `battleStars` · `lootJarBattlesSinceLast`.

**AP impact:** §11.9 (NEW — daily reward schema).

**Asset Antigravity:** calendar UI plate · jar 3-frame anim · star icon+badge · 3 streak flame icons.

**Estimate:** 3 days code + 4 days Antigravity (parallel).

---

## Q1. Cycle anchor — reuse `QuestCycle` UTC+7 hay tạo helper riêng?

`domain/QuestCycle.ts` đã có `dailyAnchor(now)` chuẩn UTC+7 midnight (Sprint D ship). Login calendar cũng cần "đã claim hôm nay chưa" check. Hai pattern lựa chọn:

- **A. Reuse trực tiếp `QuestCycle.dailyAnchor`** ⭐
  Login state lưu `lastLoginAnchorUtc7: number` thay vì ISO string. Compare `dailyAnchor(now) > lastLoginAnchorUtc7` → claimable.
  *Tradeoff:* drift khỏi roadmap field name `lastLoginIso`. Nhưng engineering-wise cleaner, dedup math.

- **B. Field `lastLoginIso: string`** (đúng roadmap)
  Lưu `new Date(dailyAnchor(now)).toISOString()`. Compare bằng string equality.
  *Tradeoff:* dual representation, dễ bug timezone parsing. Phải write helper `loginCycleHelper.ts` parallel với `QuestCycle.ts`.

- **C. New `domain/LoginCycle.ts`** — chỉ wrap `dailyAnchor` + helpers `daysSince(anchorA, anchorB)` + `streakDecays(now, lastAnchor)`.
  *Tradeoff:* new module nhưng login có concept "streak break" mà QuestCycle không cần — có thể justify split.

**Em đề xuất A** với note ISP: roadmap field rename `lastLoginIso` → `lastLoginAnchorUtc7`. Update §11.9 trước khi code.

---

## Q2. Streak break rule — bao nhiêu giờ vắng mặt thì gãy streak?

"Login streak = N consecutive day logins" — nhưng định nghĩa "consecutive" là gì?

- **A. Strict UTC+7 day:** miss 1 ngày → streak reset về 0 ngày tiếp theo. ⭐
  *Tradeoff:* nghiêm khắc, học sinh nghỉ thứ 7 mất streak. Nhưng đúng chuẩn Prodigy/Duolingo.

- **B. Grace period 48h:** lệch 1 ngày vẫn giữ streak nếu trở lại trong 48h từ last claim.
  *Tradeoff:* gentler nhưng phức tạp hơn, edge case "claim 2 ngày liên tiếp với 47h gap" cần test.

- **C. Streak = total claims trong tháng** (no break, just count).
  *Tradeoff:* mất feel "I'm on fire", không tạo dopamine streak loop.

**Em đề xuất A** — cho học sinh internal Clevai thì rule rõ ràng giúp drive return-tomorrow behavior.

---

## Q3. Streak multiplier formula

Roadmap nói "N consecutive day logins multiplies reward" nhưng không bảng. Em đề xuất 3 phương án:

- **A. Linear stair (3/7/30 ngày tier ứng với 3 streak flame icon)** ⭐
  - Day 1-2: ×1.0
  - Day 3-6: ×1.2 (small flame 🔥)
  - Day 7-29: ×1.5 (medium flame 🔥🔥)
  - Day 30+: ×2.0 (big flame 🔥🔥🔥)
  *Tradeoff:* khớp asset spec (3 flame variants), 4 tier rõ ràng.

- **B. Continuous formula** `multiplier = min(2.0, 1 + 0.05 * streak)`
  *Tradeoff:* mượt nhưng UI khó hiển thị, không khớp 3-flame asset.

- **C. Cap thấp** day 1 ×1, day 7 ×1.3, day 30 ×1.5 (tránh power creep cho học sinh).
  *Tradeoff:* an toàn nhưng dopamine kém.

**Em đề xuất A** — direct 1:1 mapping với asset.

---

## Q4. Daily login reward composition — calendar 7 ngày shows gì?

Mỗi ngày trong cycle 7-day gives 1 reward. Lựa chọn:

- **A. Mix items + battle stars** ⭐
  Day 1-2-3-5-6: random common item via `rollDrop`
  Day 4: 50 battle stars
  Day 7: rare item (cap-of-week)
  Multiplier áp lên both quantity (stars) và rarity tier (item).
  *Tradeoff:* variety loop. Day 7 có "boss day" feel.

- **B. Pure battle stars** (vì Phase 3 shop chưa tồn tại — earn-only sprint)
  Day N: `10 * N * multiplier` stars.
  *Tradeoff:* siêu đơn giản nhưng học sinh không thấy item drop = kém vibe.

- **C. Items only**
  *Tradeoff:* mâu thuẫn — Battle Stars ship trong sprint này phải có cách earn từ login, không chỉ combat.

**Em đề xuất A** — đa dạng + ship Battle Stars earn channel.

---

## Q5. Battle Stars — earn rate per battle + Phase 3 shop dependency

Roadmap: "earned per battle, spent on cosmetic items in Phase 3 shop". Sprint F earn + persist + display, **không spend**. Lựa chọn:

- **A. Earn-only sprint, không placeholder shop** ⭐
  Earn formula: `5 * combatLevel * (won ? 1 : 0.2)` + bonus from loot jar / login.
  Display: badge top-right cạnh HP/level (cùng AppShell với inventory icon).
  Phase 3 sẽ ship `/shop` route consume `battleStars`.
  *Tradeoff:* học sinh thấy currency tăng nhưng không tiêu được. Có thể frustrate. Mitigate bằng tooltip "Sắp ra mắt Cửa Hàng!".

- **B. Earn + placeholder `/shop` route** với 1-2 cosmetic mock item ("Mũ phù thủy 100 ⭐") để test spend flow.
  *Tradeoff:* +1 day code, lệch scope roadmap. Nhưng ship complete loop.

- **C. Earn only, không display** (lưu silently, hiện Phase 3).
  *Tradeoff:* học sinh không biết currency tồn tại = wasted feature.

**Em đề xuất A** với rõ tooltip "Sắp ra mắt".

---

## Q6. Loot Jar trigger — battle counter tăng ở đâu?

Roadmap: "claimable every 3 battles won". `lootJarBattlesSinceLast` counter cần increment. Pattern lựa chọn:

- **A. SaveState action `incrementJarCounter()` gọi từ `CombatScene.handleVictory`** (call-site)
  *Tradeoff:* explicit, dễ trace. Nhưng coupling combat → save layer.

- **B. New `LootJarEngine` listen `EXIT_COMBAT { won: true }` event** ⭐
  Mirror QuestEngine pattern (Sprint D) — pure observer, no combat code change.
  Cũng tiện expose `LOOT_JAR_READY` event khi counter == 3.
  *Tradeoff:* +1 module nhưng layer-clean (matches Sprint D architecture).

- **C. Inline trong QuestEngine** — multi-purpose engine.
  *Tradeoff:* QuestEngine bloat, mix concerns.

**Em đề xuất B** — đồng bộ với Sprint D pattern, layer hygiene tốt.

---

## Q7. Loot Jar reveal UI — reuse `RewardChestOverlay` hay overlay mới?

Roadmap: "jar shake → pop animation → 3 prizes flyout" — 3-frame anim khác biệt với chest reveal hiện tại.

- **A. New `LootJarOverlay.tsx`** với jar shake CSS animation + pop-frame swap + items flyout ⭐
  Listen `LOOT_JAR_READY` event. Mints 3 items qua `rollDrop`. Mount cạnh `RewardChestOverlay` trong `AppRouter`.
  *Tradeoff:* +1 component (~80 lines) nhưng asset spec yêu cầu 3-frame jar PNG khác chest sprite — buộc phải có overlay riêng.

- **B. Reuse `RewardChestOverlay` với `chestId="loot-jar-${counter}"` sentinel**
  Chest art swap thành jar art khi sentinel match.
  *Tradeoff:* sentinel-based dispatch (Sprint D R4 mitigation đã warn pattern này ugly). Animation timing khác (jar shake vs chest open) cũng khó share.

- **C. Generic `RewardRevealOverlay`** refactor cả chest và jar dùng chung, drive bởi payload `style: 'chest' | 'jar'`.
  *Tradeoff:* refactor scope creep — Sprint A-E đã ship `RewardChestOverlay` stable, đụng vào risk regression cao.

**Em đề xuất A** — new overlay, mỗi reward type 1 component.

---

## Q8. Login calendar surface — auto-popup hay button trong MainMenu?

Sprint E onboarding flow đã chiếm "first launch" của ngày (tutorial replay check). Cần coordinate.

- **A. Auto-popup khi `isLoginClaimable && !onFirstEverBoot && !inActiveTutorial`** ⭐
  Mount `<DailyLoginCalendarOverlay />` trong `AppRouter`. Mở 1 lần/ngày khi MainMenu render xong, sau khi tutorial check pass.
  *Tradeoff:* dopamine peak. Nhưng cần guard chặn không trigger lúc tutorial chạy.

- **B. Button "Quà Hằng Ngày" trong MainMenu + sparkle indicator (giống Sprint D "Nhiệm vụ" pattern)**
  Học sinh chủ động click. Sparkle khi claimable.
  *Tradeoff:* miss học sinh không chú ý sparkle = lose engagement loop.

- **C. Both** — auto-popup ngày đầu boot, button MainMenu cho sau đó.
  *Tradeoff:* +1 state flag `hasSeenTodayCalendar`, edge case nếu học sinh đóng popup không claim → button fallback.

**Em đề xuất C** — popup-first cho dopamine, button-fallback cho học sinh đóng popup vô tình. Pattern cũng dùng sparkle indicator như Sprint D MainMenu.

---

## Tóm tắt 8 quyết định em propose (anh có thể batch override):

| Q | Em đề xuất |
|---|---|
| Q1 | **A** — reuse `QuestCycle.dailyAnchor`, rename field `lastLoginIso` → `lastLoginAnchorUtc7` |
| Q2 | **A** — strict UTC+7 day, miss 1 ngày → streak reset |
| Q3 | **A** — stair multiplier 1.0 / 1.2 (3d) / 1.5 (7d) / 2.0 (30d) |
| Q4 | **A** — mix items + 50 stars on day 4 + rare item day 7 |
| Q5 | **A** — earn-only, badge cạnh inventory icon, tooltip "Sắp ra mắt" |
| Q6 | **B** — `LootJarEngine` listen `EXIT_COMBAT`, emit `LOOT_JAR_READY` |
| Q7 | **A** — new `LootJarOverlay.tsx` (3-frame jar anim) |
| Q8 | **C** — auto-popup ngày đầu + button MainMenu fallback (sparkle) |

Anh trả lời batch (vd "all default" / "Q3 chọn C, Q5 chọn B, còn lại default") em sẽ:

1. Update spec doc `docs/superpowers/specs/2026-05-07-sprint-f-rewards-design.md`
2. Anh review spec
3. Plan doc `docs/superpowers/plans/2026-05-07-sprint-f-rewards-plan.md`
4. Subagent-driven development theo plan

**End clarifying — đợi anh.**
