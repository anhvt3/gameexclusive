/**
 * Tutorial step data — Sprint E (extends Phase 1 Step 18).
 *
 * Sprint E adds 4 beats covering World Map / Pet rescue / Quests /
 * Sparkle ready indicator, and a `target` field for hybrid gesture
 * overlays (Phaser canvas anchor or React DOM selector).
 *
 * Beat 6 wording aligned to existing "bạn" addressing (POSUP 02/05/2026).
 *
 * wiki: sources/SEPO26(clev.ai_sepo26).md (POSUP = Product Owner / Super User role)
 */

import type { GestureTarget } from '@/types/identity';

export const TUTORIAL_FLAG = 'tutorial_completed';

export interface TutorialStep {
  readonly portraitFile: string;
  readonly text: string;
  readonly target?: GestureTarget;
}

export const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
  // ── Phase 1 (existing 4 beats, preserved) ──
  {
    portraitFile: 'soc_guide_greet.png',
    text: 'Chào bạn! Mình là Sóc — bạn đồng hành của bạn trong thế giới Elemagica.',
  },
  {
    portraitFile: 'soc_guide_talk.png',
    text: 'Thế giới này có quái vật mang 8 nguyên tố. Chạm vào quái là bạn bước vào trận đấu.',
    target: { type: 'canvas', selector: 'WorldScene:enemy' },
  },
  {
    portraitFile: 'soc_guide_think.png',
    text: 'Mỗi trận: chọn phép, trả lời câu đố. Trả lời đúng → gây sát thương. Sai → quái phản công.',
  },
  {
    portraitFile: 'soc_guide_cheer.png',
    text: 'Sẵn sàng chưa? Cùng bắt đầu phiêu lưu nào!',
  },

  // ── Sprint E (4 new beats, POSUP-approved 02/05/2026) ──
  // wiki: sources/SEPO26(clev.ai_sepo26).md
  {
    portraitFile: 'soc_guide_talk.png',
    text: 'Bản đồ thế giới có 3 đảo: Forest, Volcanic, Frozen.',
    target: { type: 'dom', selector: 'main-menu-play' },
  },
  {
    portraitFile: 'soc_guide_cheer.png',
    text: 'Cứu pet sau combat → pet đi cùng bạn đánh nhau.',
    target: { type: 'canvas', selector: 'CombatScene:pet-slot' },
  },
  {
    portraitFile: 'soc_guide_talk.png',
    text: 'Mở bảng Quests để xem nhiệm vụ mỗi ngày nhé.',
    target: { type: 'dom', selector: 'main-menu-quests' },
  },
  {
    portraitFile: 'soc_guide_cheer.png',
    text: 'Bấm chuông 🔔 nhận thưởng khi thấy nhiệm vụ sáng vàng nha!',
    target: { type: 'dom', selector: 'main-menu-quests-sparkle' },
  },
];
