/**
 * Quest catalog — Sprint D.
 *
 * 8 quests: 3 daily + 2 weekly + 3 main. Source events are existing
 * GameEvent types from Sprints A-C; QuestEngine (Task 5) translates
 * matching emits into QUEST_PROGRESS.
 */

import type { QuestDef, QuestId, QuestTier } from '@/types/quest';

export const QUESTS: ReadonlyArray<QuestDef> = [
  // ── Daily (refresh at UTC+7 midnight) ──
  {
    id: 'daily-combat-3',
    tier: 'daily',
    displayNameVi: 'Thắng 3 trận',
    description: 'Đánh bại 3 quái bất kỳ trong ngày',
    target: 3,
    rewardTier: 'common',
    source: 'EXIT_COMBAT',
    match: (p: { won: boolean }) => (p.won ? 1 : 0),
  },
  {
    id: 'daily-quiz-5',
    tier: 'daily',
    displayNameVi: 'Trả lời đúng 5 câu',
    description: 'Trả lời đúng 5 câu hỏi liên tiếp',
    target: 5,
    rewardTier: 'common',
    source: 'QUIZ_RESULT',
    match: (p: { correct: boolean }) => (p.correct ? 1 : 0),
  },
  {
    id: 'daily-explore-1',
    tier: 'daily',
    displayNameVi: 'Khám phá 1 vùng',
    description: 'Vào 1 zone bất kỳ trong ngày',
    target: 1,
    rewardTier: 'common',
    source: 'ENTER_ZONE',
    match: () => 1,
  },

  // ── Weekly (refresh at UTC+7 Sunday-midnight) ──
  {
    id: 'weekly-combat-20',
    tier: 'weekly',
    displayNameVi: 'Thắng 20 trận tuần này',
    description: 'Đánh bại 20 quái trong tuần',
    target: 20,
    rewardTier: 'rare',
    source: 'EXIT_COMBAT',
    match: (p: { won: boolean }) => (p.won ? 1 : 0),
  },
  {
    id: 'weekly-pet-1',
    tier: 'weekly',
    displayNameVi: 'Cứu 1 pet',
    description: 'Cứu được 1 pet từ trận chiến',
    target: 1,
    rewardTier: 'rare',
    source: 'PET_COLLECTED',
    match: () => 1,
  },

  // ── Main story (no expiry; once claimed, stays claimed) ──
  {
    id: 'main-level-5',
    tier: 'main',
    displayNameVi: 'Đạt cấp 5',
    description: 'Đưa anh hùng lên cấp 5',
    target: 1,
    rewardTier: 'epic',
    source: 'LEVEL_UP',
    match: (p: { newLevel: number }) => (p.newLevel >= 5 ? 1 : 0),
  },
  {
    id: 'main-boss-forest',
    tier: 'main',
    displayNameVi: 'Đánh bại boss rừng',
    description: 'Hạ gục boss của Đảo Rừng Xanh',
    target: 1,
    rewardTier: 'epic',
    source: 'BOSS_DEFEATED',
    match: (p: { bossId: string }) => (p.bossId === 'forest-boss' ? 1 : 0),
  },
  {
    id: 'main-pets-3',
    tier: 'main',
    displayNameVi: 'Sở hữu 3 pet',
    description: 'Cứu và giữ 3 pet trong roster',
    target: 3,
    rewardTier: 'epic',
    source: 'PET_COLLECTED',
    match: () => 1,
  },
];

export function findQuestDef(id: QuestId): QuestDef | null {
  return QUESTS.find((q) => q.id === id) ?? null;
}

export function questsByTier(tier: QuestTier): ReadonlyArray<QuestDef> {
  return QUESTS.filter((q) => q.tier === tier);
}
