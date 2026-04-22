/**
 * GuildLeaderboard — ISP v1.1 Step 22.5 (single-player static).
 *
 * "Bảng xếp hạng lớp" — renders the Phase 1 30-row fake roster sorted
 * by weekly EXP descending, with the current student highlighted.
 * Phase 5 will wire Supham's real class service behind
 * loadGuildClass(); this screen stays the same.
 */

import { useNavigate } from 'react-router-dom';
import { loadGuildClass, sortByWeeklyExp } from '@data/guild/GuildClassmatesAdapter';

// TODO Step 24+: read grade from student profile / auth.
const STUB_GRADE = 'G5';

export function GuildLeaderboard() {
  const navigate = useNavigate();
  const classData = loadGuildClass(STUB_GRADE);

  if (!classData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-amber-50 text-amber-900">
        <div className="max-w-md text-center">
          <p className="mb-4">Chưa có dữ liệu lớp cho khối {STUB_GRADE}.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white"
          >
            Về menu
          </button>
        </div>
      </main>
    );
  }

  const sorted = sortByWeeklyExp(classData.students);
  const currentId = classData.current_student_id;

  return (
    <main
      aria-label="Bảng xếp hạng lớp"
      className="guild-leaderboard min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 px-4 py-8"
    >
      <header className="mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-900">
            Bảng xếp hạng lớp
          </h1>
          <p className="text-sm text-amber-700">
            {classData.class_name} · Tuần bắt đầu {classData.week_start_iso}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
        >
          Về menu
        </button>
      </header>

      <ol
        role="list"
        className="mx-auto flex max-w-2xl flex-col gap-2"
        data-testid="leaderboard-rows"
      >
        {sorted.map((student, idx) => {
          const isMe = student.id === currentId;
          return (
            <li
              key={student.id}
              data-student-id={student.id}
              aria-current={isMe ? 'true' : undefined}
              className={[
                'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition',
                isMe
                  ? 'border-orange-400 bg-orange-100 ring-2 ring-orange-400'
                  : 'border-amber-200 bg-white',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-8 w-10 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold',
                  idx < 3 ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-700',
                ].join(' ')}
              >
                {idx + 1}
              </span>
              <span
                aria-hidden="true"
                className="h-8 w-8 flex-shrink-0 rounded-full"
                style={{ backgroundColor: student.avatar_color }}
              />
              <span
                className={[
                  'flex-1 truncate font-medium',
                  isMe ? 'text-orange-900' : 'text-amber-900',
                ].join(' ')}
              >
                {student.name}
                {isMe && <span className="ml-2 text-xs font-normal">(bạn)</span>}
              </span>
              <span className="font-semibold text-amber-800">
                {student.weekly_exp.toLocaleString('vi-VN')} EXP
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
