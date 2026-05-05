/**
 * QuestsPanel — Sprint D Task 10.
 *
 * Route: /quests. Renders 3 tier sections (daily / weekly / main); each
 * QuestCard shows one of three states: in-progress (progress bar M/N),
 * ready (sparkle "Nhận thưởng" button), or claimed ("✓ Đã nhận"). Click
 * claim → SaveState.claimQuestReward → emits CHEST_OPENED with
 * label="Đóng"; existing RewardChestOverlay (Task 8) reveals loot.
 *
 * Layer: react/screens — KHÔNG import Phaser.
 */

import { Link } from 'react-router-dom';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { questsByTier } from '@data/staticConfig/quests';
import { TIER_LABEL_VI, type QuestDef, type QuestTier } from '@/types/quest';

const TIERS: ReadonlyArray<QuestTier> = ['daily', 'weekly', 'main'];

export function QuestsPanel() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📜 Nhiệm vụ</h1>
        <Link
          to="/"
          data-testid="quests-back-home"
          className="rounded bg-slate-300 px-3 py-1 text-sm"
        >
          Quay lại
        </Link>
      </header>

      {TIERS.map((tier) => (
        <TierSection key={tier} tier={tier} />
      ))}
    </div>
  );
}

function TierSection({ tier }: { tier: QuestTier }) {
  const quests = questsByTier(tier);
  return (
    <section data-testid={`quests-tier-${tier}`} className="mb-6 rounded-lg bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-semibold">{TIER_LABEL_VI[tier]}</h2>
      <div className="space-y-2">
        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
    </section>
  );
}

function QuestCard({ quest }: { quest: QuestDef }) {
  const progress = useSaveState((s) => s.questProgress[quest.id] ?? 0);
  const claimed = useSaveState((s) => s.claimedRewards.includes(quest.id));
  const heroLevel = useSaveState((s) => s.level);
  const isReady = progress >= quest.target && !claimed;

  const handleClaim = () => {
    const item = useSaveState.getState().claimQuestReward(quest.id, heroLevel);
    if (!item) return;
    eventBus.emit('CHEST_OPENED', {
      chestId: `quest-${quest.id}`,
      zoneId: 'quest-panel',
      items: [{ itemId: item.id, qty: 1 }],
      label: 'Đóng',
    });
  };

  const pct = Math.min(100, (progress / quest.target) * 100);

  return (
    <div
      data-testid={`quest-card-${quest.id}`}
      className={`rounded border-2 p-3 ${
        claimed ? 'border-slate-200 opacity-60' : isReady ? 'border-amber-400' : 'border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{quest.displayNameVi}</div>
          <div className="text-xs text-slate-600">{quest.description}</div>
        </div>
        {claimed ? (
          <span className="text-sm text-slate-500">✓ Đã nhận</span>
        ) : isReady ? (
          <button
            data-testid={`quest-claim-${quest.id}`}
            onClick={handleClaim}
            className="rounded bg-amber-400 px-3 py-1 font-bold text-white"
          >
            ✨ Nhận thưởng
          </button>
        ) : (
          <span className="text-sm text-slate-500">
            ({progress}/{quest.target})
          </span>
        )}
      </div>
      {!claimed && !isReady && (
        <div className="mt-2 h-2 w-full rounded bg-slate-200">
          <div className="h-full rounded bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
