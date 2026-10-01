// Szubjektív baseline: öt csúszka – „Szerinted milyen volt eddig egy átlagos nap?”

import type { SubjectiveBaseline } from '@/domain/types';
import { valueFill } from '@/components/scaleColor';

const ITEMS: {
  key: keyof SubjectiveBaseline;
  label: string;
  min: number;
  max: number;
  anchors: [string, string];
}[] = [
  {
    key: 'sleepQuality',
    label: 'Alvásminőség',
    min: 1,
    max: 10,
    anchors: ['borzalmas', 'teljesen kipihent'],
  },
  { key: 'nose', label: 'Orr / légzés', min: 0, max: 10, anchors: ['szabad', 'eldugult'] },
  { key: 'fatigue', label: 'Fáradtság', min: 0, max: 10, anchors: ['friss', 'alig bírtam'] },
  {
    key: 'postMealFatigue',
    label: 'Evés utáni fáradtság',
    min: 0,
    max: 10,
    anchors: ['semmi', 'le kellett dőlni'],
  },
  { key: 'bloating', label: 'Puffadás', min: 0, max: 10, anchors: ['semmi', 'fájdalmas'] },
];

export function SubjectiveSliders({
  value,
  onChange,
}: {
  value: SubjectiveBaseline;
  onChange: (next: SubjectiveBaseline) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {ITEMS.map((it) => {
        const v = value[it.key];
        const shown = v ?? Math.round((it.min + it.max) / 2);
        return (
          <div key={it.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={`subj-${it.key}`} className="text-[15px] font-medium">
                {it.label}
              </label>
              <span
                className="num grid h-8 min-w-10 place-items-center rounded-full px-2 text-[15px] font-semibold text-scale-ink"
                style={{
                  background:
                    v === undefined
                      ? 'var(--surface-2)'
                      : valueFill(v, it.min, it.max, it.key === 'sleepQuality'),
                }}
              >
                {v ?? '–'}
              </span>
            </div>
            <input
              id={`subj-${it.key}`}
              type="range"
              min={it.min}
              max={it.max}
              step={1}
              value={shown}
              aria-valuetext={v === undefined ? 'nincs megadva' : String(v)}
              onChange={(e) => onChange({ ...value, [it.key]: Number(e.target.value) })}
              className="w-full accent-[var(--plan)]"
            />
            <div className="flex justify-between text-[12px] text-muted">
              <span>
                {it.min} = {it.anchors[0]}
              </span>
              <span>
                {it.max} = {it.anchors[1]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
