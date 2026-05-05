import { NAME_PRESETS, randomPreset, type NamePreset } from '@data/staticConfig/namePresets';

interface Props {
  onPick: (preset: NamePreset) => void;
  rng?: () => number;
}

export function NamePicker({ onPick, rng = Math.random }: Props) {
  const males = NAME_PRESETS.filter((p) => p.gender === 'male');
  const females = NAME_PRESETS.filter((p) => p.gender === 'female');

  return (
    <div className="rounded-lg bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-xl font-bold">Chọn tên của bạn</h2>

      <section data-testid="name-section-male" className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">Nam</h3>
        <div className="grid grid-cols-3 gap-2">
          {males.map((p) => (
            <button
              key={p.name}
              data-testid={`name-preset-${p.name}`}
              onClick={() => onPick(p)}
              className="rounded border-2 border-blue-300 bg-blue-50 px-3 py-2 text-sm hover:bg-blue-100"
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section data-testid="name-section-female" className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">Nữ</h3>
        <div className="grid grid-cols-3 gap-2">
          {females.map((p) => (
            <button
              key={p.name}
              data-testid={`name-preset-${p.name}`}
              onClick={() => onPick(p)}
              className="rounded border-2 border-pink-300 bg-pink-50 px-3 py-2 text-sm hover:bg-pink-100"
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <button
        data-testid="name-random"
        onClick={() => onPick(randomPreset(rng))}
        className="w-full rounded bg-amber-400 px-4 py-2 font-bold text-white"
      >
        🎲 Ngẫu nhiên
      </button>
    </div>
  );
}
