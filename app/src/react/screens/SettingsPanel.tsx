import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSaveState } from '@/persistence/SaveStateStore';
import { HINT_DIFFICULTIES, type HintDifficulty } from '@/types/identity';
import { TUTORIAL_FLAG } from '@/react/mascot/tutorialSteps';
import { audioManager } from '@/utils/AudioManager';

const HINT_LABEL_VI: Record<HintDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
};

export function SettingsPanel() {
  const navigate = useNavigate();
  const muted = useSaveState((s) => s.flags['audio_muted'] ?? false);
  const hintDifficulty = useSaveState((s) => s.hintDifficulty);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAudioToggle = () => {
    const next = !muted;
    useSaveState.getState().setFlag('audio_muted', next);
    audioManager.setMuted(next);
  };

  const handleHintChange = (d: HintDifficulty) => {
    useSaveState.getState().setHintDifficulty(d);
  };

  const handleReplayTutorial = () => {
    useSaveState.getState().setFlag(TUTORIAL_FLAG, false);
    navigate('/');
  };

  const handleResetConfirm = () => {
    useSaveState.getState().reset();
    setConfirmReset(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">⚙️ Cài đặt</h1>
        <Link
          to="/"
          data-testid="settings-back-home"
          className="rounded bg-slate-300 px-3 py-1 text-sm"
        >
          Quay lại
        </Link>
      </header>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">🔊 Âm thanh</h2>
        <button
          data-testid="settings-audio-toggle"
          onClick={handleAudioToggle}
          className={`rounded px-4 py-2 font-bold ${
            muted ? 'bg-slate-400 text-white' : 'bg-emerald-500 text-white'
          }`}
        >
          {muted ? 'Đang tắt' : 'Đang bật'}
        </button>
      </section>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">💡 Độ khó gợi ý quiz</h2>
        <div className="flex gap-2">
          {HINT_DIFFICULTIES.map((d) => (
            <button
              key={d}
              data-testid={`settings-hint-${d}`}
              onClick={() => handleHintChange(d)}
              className={`flex-1 rounded border-2 px-3 py-2 ${
                hintDifficulty === d ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-300'
              }`}
            >
              {HINT_LABEL_VI[d]}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">↺ Hướng dẫn</h2>
        <button
          data-testid="settings-replay-tutorial"
          onClick={handleReplayTutorial}
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white"
        >
          Xem lại hướng dẫn
        </button>
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">🗑️ Xoá lưu game</h2>
        <button
          data-testid="settings-reset-save"
          onClick={() => setConfirmReset(true)}
          className="rounded bg-rose-500 px-4 py-2 font-bold text-white"
        >
          Xoá toàn bộ tiến trình
        </button>
      </section>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded bg-white p-4 max-w-xs">
            <p className="mb-3">Xoá toàn bộ tiến trình? Sẽ tải lại trang. Không thể hoàn tác.</p>
            <div className="flex gap-2">
              <button
                data-testid="reset-confirm-yes"
                onClick={handleResetConfirm}
                className="flex-1 rounded bg-rose-500 px-3 py-1 font-bold text-white"
              >
                Xoá
              </button>
              <button
                data-testid="reset-confirm-no"
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded bg-slate-300 px-3 py-1"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
