/**
 * CombatPreview — Dev-only quick preview tool (NOT part of ISP).
 *
 * Purpose: visual verification of CombatScene + asset loading without
 * committing to Step 21 (Main Menu + Router).
 *
 * Trigger: visit `http://localhost:5173/?preview=combat&monster=1`
 *   monster query: 1=Embershed, 4=Tidus, 7=Applepot, 10=Frostfang, 13=Voltee
 *
 * Remove this component once Step 21 (Main Menu + Routing) lands.
 */

import { useEffect, useState } from 'react';
import { PhaserGame } from '@game/PhaserGame';
import { QuizOverlay } from '@react/quiz/QuizOverlay';
import { eventBus } from '@bus/EventBus';
import { STARTER_MONSTERS } from '@data/staticConfig/monsters';

function getMonsterIdFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('monster');
  if (!raw) return 1;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

export function CombatPreview() {
  const [started, setStarted] = useState(false);
  const monsterId = getMonsterIdFromUrl();
  const monster = STARTER_MONSTERS.find((m) => m.id === monsterId);

  useEffect(() => {
    // Delay so Phaser finishes boot + preload before we fire combat
    if (started) return;
    const timer = window.setTimeout(() => {
      eventBus.emit('ENTER_COMBAT', { monster_id: monsterId });
      setStarted(true);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [monsterId, started]);

  return (
    <div className="combat-preview relative h-screen w-screen bg-slate-900">
      <div className="absolute left-4 top-4 z-10 rounded bg-black/70 px-3 py-2 text-sm text-white">
        <p className="font-bold">🎮 Combat Preview (dev)</p>
        <p>
          Monster:{' '}
          {monster ? `${monster.displayNameVi} (${monster.element})` : `#${monsterId} not found`}
        </p>
        <p className="text-xs text-gray-300">Try ?monster=1|4|7|10|13 for each starter</p>
      </div>
      <PhaserGame />
      <QuizOverlay />
    </div>
  );
}
