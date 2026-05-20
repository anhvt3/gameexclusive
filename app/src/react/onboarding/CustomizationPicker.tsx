import { useState } from 'react';
import { HAIR_STYLES, GENDERS, type Gender, type HairStyle } from '@/types/identity';

interface Props {
  initialGender: Gender;
  initialHair: HairStyle;
  onComplete: (selection: { gender: Gender; hairStyle: HairStyle }) => void;
}

export function CustomizationPicker({ initialGender, initialHair, onComplete }: Props) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [hair, setHair] = useState<HairStyle>(initialHair);

  return (
    <div className="rounded-lg bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-xl font-bold">Tuỳ chỉnh nhân vật</h2>

      <div className="mb-6 flex justify-center">
        <div className="relative h-48 w-48">
          {/* B-04: base_player_*_transparent.png is a 1024x1024 reference
              sheet with 6 wizards baked into one image (2 top + 4 bottom).
              Crop to the top-left 512x512 quadrant (front-facing wizard)
              via CSS background tiling so the React preview matches the
              in-game cropped Phaser sprite. */}
          <div
            data-testid="preview-base"
            aria-label="Base"
            role="img"
            className="absolute inset-0 h-full w-full"
            style={{
              backgroundImage: `url(/assets/juice/base_player_${gender}_transparent.png)`,
              backgroundSize: '200% 200%',
              backgroundPosition: '0% 0%',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <img
            data-testid="preview-hair"
            src={`/assets/player/hair/${gender}_hair_${hair}.png`}
            alt="Hair"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      </div>

      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">Giới tính</h3>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              data-testid={`gender-${g}`}
              onClick={() => setGender(g)}
              className={`flex-1 rounded border-2 px-4 py-2 ${
                gender === g ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-300'
              }`}
            >
              {g === 'male' ? 'Nam' : 'Nữ'}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">Kiểu tóc</h3>
        <div className="grid grid-cols-4 gap-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h}
              data-testid={`hair-${h}`}
              onClick={() => setHair(h)}
              className={`rounded border-2 p-2 ${
                hair === h ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-300'
              }`}
            >
              <img
                src={`/assets/player/hair/${gender}_hair_${h}.png`}
                alt={`Tóc ${h.toUpperCase()}`}
                className="mx-auto h-12 w-12 object-contain"
              />
              <div className="text-center text-xs">{h.toUpperCase()}</div>
            </button>
          ))}
        </div>
      </section>

      <button
        data-testid="customization-confirm"
        onClick={() => onComplete({ gender, hairStyle: hair })}
        className="w-full rounded bg-emerald-500 px-4 py-2 font-bold text-white"
      >
        ✓ Hoàn tất
      </button>
    </div>
  );
}
